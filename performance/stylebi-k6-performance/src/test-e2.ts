import http, { RefinedParams } from "k6/http";
import ws from "k6/ws";
import { check } from "k6";

import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.0.0/index.js";
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.1.0/index.js";
import { b64encode } from "k6/encoding";
import { WebsocketContext } from "./websocket-context";
import { WebsocketMessaging } from "./ws-messaging";
import { Counter, Trend } from "k6/metrics";
import {
   applySelection,
   buildWebsocketURL,
   clearSelection,
   closeViewsheet,
   refreshChartAreas,
   sendConnectMessage,
   sendOpenViewsheetCommand,
   sendSubscribeMessage,
   setupGenericSocketOnMessage,
} from "./websocket-library";
import { SendStage } from "./stages/send-stage";
import { LambdaStage } from "./stages/lambda-stage";
import { SendAndListenStage } from "./stages/send-and-listen-stage";
import { PauseStage } from "./stages/pause-stage";
import { BatchStage } from "./stages/batch-stage";
import {
   QUIET_PERIOD,
   RAMPUP_TIME,
   USERS,
   getUserCredentials,
   getEntryId,
   getBaseUrl,
   getSelectionValue,
} from "./config";

// E2 test: Combined user scaling + data volume testing
// Use USERS, RAMPUPTIME, and VSNAME env vars to configure

export let options = {
  summaryTimeUnit: 'ms',
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'count'],
  scenarios: {
    main: {
      executor: 'ramping-vus',
      startTime: '0s',
      gracefulStop: '30s',
      stages: [
        { duration: `${RAMPUP_TIME}s`, target: parseInt(USERS) },
        { duration: '1200s', target: parseInt(USERS) },
        { duration: '30s', target: 0 },
        { duration: `${QUIET_PERIOD}s`, target: 0 },
      ],
      gracefulRampDown: "30s"
    },
  }
};

let selectionCounter = new Counter("selection_counter");
let selectionTime = new Trend("selection_time", true);
let viewsheetOpenTime = new Trend("viewsheet_open_time", true);

export default function () {
   const { user, password } = getUserCredentials(__VU);
   const clientID = uuidv4();
   const entryID = getEntryId();
   const chartName = __ENV.CHART_NAME || "Chart1";
   const selectionListName = __ENV.SELECTION_NAME || "SelectionList1";

   var params: RefinedParams<any> = {
      headers: {
         "Authorization": `Basic ${b64encode(`${user}:${password}`)}`,
         "LoginAsUser": user
      }
   }

   const baseUrl = getBaseUrl();
   // Just get session without opening a viewsheet
   let res = http.get(`${baseUrl}/`, params);

   if (!res.cookies["SESSION"] || !res.cookies["SESSION"][0]) {
      console.log(`Failed to get session for user ${user}. Status: ${res.status}`);
      return;
   }

   const url = buildWebsocketURL();
   let cookieHeader = `SESSION=${res.cookies["SESSION"][0].value}`;
   // Include SERVERID for HAProxy sticky sessions
   if (res.cookies["SERVERID"] && res.cookies["SERVERID"][0]) {
      cookieHeader += `; SERVERID=${res.cookies["SERVERID"][0].value}`;
   }
   // Include all AWS ALB sticky session cookies (AWSALB, AWSALBCORS, AWSALBAPP-*)
   for (const cookieName of Object.keys(res.cookies)) {
      if (cookieName.startsWith("AWSALB")) {
         cookieHeader += `; ${cookieName}=${res.cookies[cookieName][0].value}`;
      }
   }
   const params2 = {
      headers: {
         "Cookie": cookieHeader
      }
   };

   let res2 = ws.connect(url, params2, function (socket) {
      const context: WebsocketContext = {socket, entryID, clientID};

      const applySelectionWithCounter = (context: WebsocketContext) => {
         const selectionValue = getSelectionValue(context.iterationIdx);
         applySelection(selectionListName,
            [{value: selectionValue, selected: true}], context);
      }

      let startTime: number;
      let viewsheetOpenStartTime: number;
      const websocketMessaging = new WebsocketMessaging(socket, context);

      websocketMessaging.addStages(
         new SendAndListenStage(sendConnectMessage, "CONNECTED"),
         new SendStage(sendSubscribeMessage),
         new LambdaStage(() => viewsheetOpenStartTime = Date.now()),
         new SendAndListenStage(sendOpenViewsheetCommand, "ClearLoadingCommand"),
         new LambdaStage(() => viewsheetOpenTime.add(Date.now() - viewsheetOpenStartTime)),
         new SendAndListenStage(refreshChartAreas.bind(null, chartName), "SetChartAreasCommand"),
         new BatchStage([
            new LambdaStage(() => startTime = Date.now()),
            new SendAndListenStage(applySelectionWithCounter, "UpdateUndoStateCommand"),
            new SendAndListenStage(refreshChartAreas.bind(null, chartName), "SetChartAreasCommand"),
            new SendAndListenStage(clearSelection.bind(null, selectionListName), "UpdateUndoStateCommand"),
            new SendAndListenStage(refreshChartAreas.bind(null, chartName), "SetChartAreasCommand"),
            new LambdaStage(() => {
               selectionCounter.add(1);
               selectionTime.add(Date.now() - startTime);
            }),
            new PauseStage(randomIntBetween(10000, 15000))
         ], {durationMs: 3600000}),
         new SendStage(closeViewsheet)
      )

      socket.on("open", () => {
         websocketMessaging.start();
      });

      setupGenericSocketOnMessage(context);
   });

   check(res2, { "status is 101": (r) => r && r.status === 101 });
}
