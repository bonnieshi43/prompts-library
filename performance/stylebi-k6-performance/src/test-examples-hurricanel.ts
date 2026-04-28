import http, { RefinedParams } from "k6/http";
import ws from "k6/ws";
import { check, fail } from "k6";
import { Options } from "k6/options";

import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.0.0/index.js";
import { b64encode } from "k6/encoding";
import { WebsocketContext } from "./websocket-context";
import { WebsocketMessaging } from "./ws-messaging";
import { Counter, Trend } from "k6/metrics";
import {
   applySelection,
   buildWebsocketURL,
   closeViewsheet,
   refreshChartAreas,
   sendConnectMessage,
   sendOpenViewsheetCommand,
   sendSubscribeMessage,
} from "./websocket-library";
import { SendStage } from "./stages/send-stage";
import { LambdaStage } from "./stages/lambda-stage";
import { SendAndListenStage } from "./stages/send-and-listen-stage";
import { PauseStage } from "./stages/pause-stage";
import { BatchStage } from "./stages/batch-stage";
import { setupGenericSocketOnMessage } from "./websocket-library";

export let options: Options = {
   vus: 2,
   iterations: 2
};

let selectionCounter = new Counter("selection_counter"/*, true*/);
let selectionTime = new Trend("selection_time", true);

export default function () {
   // const user = "user" + __VU;
   // const password = "success123";
   const user = "admin";
   const password = "admin";

   let clientID = uuidv4();
   let entryID = "1^128^__NULL__^Examples/HurricaneL"

   let chartName = "Map";
   let selectionListName = "Year";

   var params: RefinedParams<any> = {
      headers: {
         "Authorization": `Basic ${b64encode(`${user}:${password}`)}`,
         "LoginAsUser": user
      }
   }

   let res = http.get(encodeURI(`http://localhost:8080/sree/app/viewer/view/${entryID}`), params)

   if(res.status >= 400) {
      fail(`Initial request returned an error response: ${res.status_text}`);
   }

   // console.log(JSON.stringify(res.cookies));

   const wsUrl = buildWebsocketURL();
   const wsParams = {
      headers: {
         "Cookie": `SESSION=${res.cookies["SESSION"][0].value}; XSRF-TOKEN=${res.cookies["XSRF-TOKEN"][0].value}`
      }
   };

   let res2 = ws.connect(wsUrl, wsParams, function (socket) {
      console.info(`Starting websocket connection for VU: ${__VU}`);
      const context: WebsocketContext = {socket, entryID, clientID};

      const applySelectionWithCounter = (context: WebsocketContext) => {
         applySelection(selectionListName,
            [{value: [1986 + context.iterationIdx + ""], selected: true}], context);
      }

      let startTime: number;
      const websocketMessaging = new WebsocketMessaging(socket, context);

      websocketMessaging.addStages(
         new SendAndListenStage(sendConnectMessage, "CONNECTED"),
         new SendStage(sendSubscribeMessage),
         new SendAndListenStage(sendOpenViewsheetCommand, "SetRuntimeIdCommand"),
         new SendAndListenStage(refreshChartAreas.bind(null, chartName), "SetChartAreasCommand"),
         new BatchStage( [
            new LambdaStage(() => startTime = Date.now()),
            new SendAndListenStage(applySelectionWithCounter, "UpdateUndoStateCommand"),
            new SendAndListenStage(refreshChartAreas.bind(null, chartName), "SetChartAreasCommand"),
            // new SendAndListenStage(clearSelection.bind(null, selectionListName), "UpdateUndoStateCommand")
            // new SendAndListenStage(refreshChartAreas.bind(null, chartName), "SetChartAreasCommand"),
            new LambdaStage(() => {
               selectionCounter.add(1);
               selectionTime.add(Date.now() - startTime)
            }),
            new PauseStage(300)
         ], {totalIterations: 2/*9*/}),
         new SendStage(closeViewsheet)
      )

      socket.on("open", () => {
         // console.log("connected");
         websocketMessaging.start();
      });

      setupGenericSocketOnMessage(context);
      // socket.on("close", () => console.log("disconnected"));
   });

   check(res2, { "status is 101": (r) => r && r.status === 101 });
}
