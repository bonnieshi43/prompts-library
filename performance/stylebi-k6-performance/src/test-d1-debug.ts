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
import { SendAndListenStageDebug } from "./stages/send-and-listen-stage-debug";
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

// DEBUG VERSION - Logs timestamps for each stage

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
        { duration: `${RAMPUP_TIME}s`, target: parseInt(USERS) },
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

// Helper to format timestamp
function ts(): string {
   const now = new Date();
   return `${now.toISOString().substr(11, 12)}`;
}

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
   console.log(`[${ts()}] VU${__VU}: Starting HTTP request to ${baseUrl}/`);
   let res = http.get(`${baseUrl}/`, params);
   console.log(`[${ts()}] VU${__VU}: HTTP response received, status=${res.status}`);

   if (!res.cookies["SESSION"] || !res.cookies["SESSION"][0]) {
      console.log(`[${ts()}] VU${__VU}: FAILED - No session cookie`);
      return;
   }

   const url = buildWebsocketURL();
   let cookieHeader = `SESSION=${res.cookies["SESSION"][0].value}`;
   if (res.cookies["SERVERID"] && res.cookies["SERVERID"][0]) {
      cookieHeader += `; SERVERID=${res.cookies["SERVERID"][0].value}`;
   }
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

   console.log(`[${ts()}] VU${__VU}: Connecting WebSocket to ${url}`);

   let res2 = ws.connect(url, params2, function (socket) {
      const context: WebsocketContext = {socket, entryID, clientID};

      const applySelectionWithCounter = (context: WebsocketContext) => {
         const selectionValue = getSelectionValue(context.iterationIdx);
         console.log(`[${ts()}] VU${__VU}: Applying selection: "${selectionValue}"`);
         applySelection(selectionListName,
            [{value: selectionValue, selected: true}], context);
      }

      let startTime: number;
      let viewsheetOpenStartTime: number;
      let selectionIdx = 0;
      const websocketMessaging = new WebsocketMessaging(socket, context);

      websocketMessaging.addStages(
         // Connect
         new SendAndListenStageDebug(sendConnectMessage, "CONNECTED"),

         // Subscribe
         new SendStage(sendSubscribeMessage),

         // Open Viewsheet - START TIMING
         new LambdaStage(() => {
            viewsheetOpenStartTime = Date.now();
            console.log(`[${ts()}] VU${__VU}: >>> VIEWSHEET_OPEN_START`);
         }),
         new SendAndListenStageDebug(sendOpenViewsheetCommand, "ClearLoadingCommand"),
         new LambdaStage(() => {
            const elapsed = Date.now() - viewsheetOpenStartTime;
            console.log(`[${ts()}] VU${__VU}: <<< VIEWSHEET_OPEN_END (${elapsed}ms)`);
            viewsheetOpenTime.add(elapsed);
         }),

         // Initial chart refresh
         new SendAndListenStageDebug(refreshChartAreas.bind(null, chartName), "SetChartAreasCommand"),

         // Selection loop
         new BatchStage([
            // START SELECTION TIMING
            new LambdaStage(() => {
               selectionIdx++;
               startTime = Date.now();
               console.log(`[${ts()}] VU${__VU}: >>> SELECTION_CYCLE_${selectionIdx}_START`);
            }),

            // Apply selection
            new SendAndListenStageDebug(applySelectionWithCounter, "UpdateUndoStateCommand"),
            new LambdaStage(() => console.log(`[${ts()}] VU${__VU}: (${Date.now() - startTime}ms elapsed)`)),

            // Refresh chart after selection
            new SendAndListenStageDebug(refreshChartAreas.bind(null, chartName), "SetChartAreasCommand"),
            new LambdaStage(() => console.log(`[${ts()}] VU${__VU}: (${Date.now() - startTime}ms elapsed)`)),

            // Clear selection
            new SendAndListenStageDebug(clearSelection.bind(null, selectionListName), "UpdateUndoStateCommand"),
            new LambdaStage(() => console.log(`[${ts()}] VU${__VU}: (${Date.now() - startTime}ms elapsed)`)),

            // Refresh chart after clear
            new SendAndListenStageDebug(refreshChartAreas.bind(null, chartName), "SetChartAreasCommand"),
            new LambdaStage(() => {
               const elapsed = Date.now() - startTime;
               console.log(`[${ts()}] VU${__VU}: <<< SELECTION_CYCLE_${selectionIdx}_END (${elapsed}ms total)`);
               selectionCounter.add(1);
               selectionTime.add(elapsed);
            }),

            // Pause
            new LambdaStage(() => console.log(`[${ts()}] VU${__VU}: Pausing 10-15s...`)),
            new PauseStage(randomIntBetween(10000, 15000)),
         ], {durationMs: 3600000}),

         // Close
         new LambdaStage(() => console.log(`[${ts()}] VU${__VU}: Closing viewsheet`)),
         new SendStage(closeViewsheet)
      )

      socket.on("open", () => {
         console.log(`[${ts()}] VU${__VU}: WebSocket opened`);
         websocketMessaging.start();
      });

      setupGenericSocketOnMessage(context);
   });

   check(res2, { "status is 101": (r) => r && r.status === 101 });
}
