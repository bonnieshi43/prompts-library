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
   applyBrush,
   addColumns,
   applySelection,
   buildWebsocketURL,
   clearBrush,
   clearSelection,
   closeViewsheet,
   refreshChartAreas,
   resizeAxis,
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
   ACTION_ITERATIONS,
   ACTION_TYPE,
   ADD_COLUMNS_ASSEMBLY,
   ADD_COLUMNS_ATTRIBUTE,
   ADD_COLUMNS_BODY,
   ADD_COLUMNS_DESCRIPTION,
   ADD_COLUMNS_DTYPE,
   ADD_COLUMNS_EMBEDDED,
   ADD_COLUMNS_EXPRESSION,
   ADD_COLUMNS_IDENTIFIER,
   ADD_COLUMNS_ISCALC,
   ADD_COLUMNS_PATH,
   ADD_COLUMNS_SOURCE,
   ADD_COLUMNS_TABLE,
   ADD_COLUMNS_TOOLTIP,
   ADD_COLUMNS_TYPE,
   BRUSH_RANGE_SELECTION,
   QUIET_PERIOD,
   RAMPUP_TIME,
   RESIZE_AXIS_FIELD,
   RESIZE_AXIS_SIZE,
   RESIZE_AXIS_TYPE,
   RUN_ONCE,
   USERS,
   getBrushValue,
   getUserCredentials,
   getEntryId,
   getBaseUrl,
   getSelectionValue,
} from "./config";

const runOnce = RUN_ONCE;
const userCount = parseInt(USERS);

const rampingScenario = {
   executor: 'ramping-vus',
   startTime: '0s',
   gracefulStop: '30s',
   stages: [
      { duration: `${RAMPUP_TIME}s`, target: userCount },
      { duration: `${RAMPUP_TIME}s`, target: userCount },
      { duration: '30s', target: 0 },
      { duration: `${QUIET_PERIOD}s`, target: 0 },
   ],
   gracefulRampDown: "30s"
};

const runOnceScenario = {
   executor: 'shared-iterations',
   vus: userCount,
   iterations: userCount,
   maxDuration: `${Math.max(parseInt(RAMPUP_TIME) + 60, 60)}s`,
};

export let options = {
  summaryTimeUnit: 'ms',
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'count'],
  scenarios: {
    main: runOnce ? runOnceScenario : rampingScenario,
  }
};

let actionCounter = new Counter("action_counter");
let filterTime = new Trend("filter_time", true);
let brushTime = new Trend("brush_time", true);
let resizeAxisTime = new Trend("resize_axis_time", true);
let addColumnsTime = new Trend("add_columns_time", true);
let viewsheetOpenTime = new Trend("viewsheet_open_time", true);

function buildAddColumnsBody(chartName: string): string {
   if (!ADD_COLUMNS_PATH || !ADD_COLUMNS_TABLE) {
      throw new Error("When ACTION_TYPE=add-columns, either ADD_COLUMNS_BODY must be set, or both ADD_COLUMNS_PATH and ADD_COLUMNS_TABLE must be set.");
   }

      const identifier = ADD_COLUMNS_IDENTIFIER || `0^12^__NULL__^${ADD_COLUMNS_PATH}^host-org`;
      const description = ADD_COLUMNS_DESCRIPTION || `Data Source${ADD_COLUMNS_PATH}`;
      const assembly = ADD_COLUMNS_ASSEMBLY || ADD_COLUMNS_TABLE;
      const dtype = ADD_COLUMNS_DTYPE;
      const source = ADD_COLUMNS_SOURCE || "baseWorksheet";
      const attribute = ADD_COLUMNS_ATTRIBUTE || ADD_COLUMNS_PATH.split("/").filter(Boolean).slice(-1)[0];
      const type = ADD_COLUMNS_TYPE || "7";
      const tooltip = ADD_COLUMNS_TOOLTIP || "";
      const expression = ADD_COLUMNS_EXPRESSION || "false";
      const embedded = ADD_COLUMNS_EMBEDDED || "false";
      const isCalc = ADD_COLUMNS_ISCALC || "false";

      const properties: Record<string, string> = {
         expression,
         Tooltip: tooltip,
         assembly,
         dtype,
         source,
         attribute,
         type,
         embedded,
         isCalc,
      };

   return JSON.stringify({
      name: chartName,
      transfer: null,
      dropTarget: {
         dropType: "2",
         dropIndex: 0,
         replace: false,
         classType: "ChartViewDropTarget",
         transferType: "field",
         assembly: chartName,
         objectType: "vschart",
      },
      entries: [
         {
            scope: 0,
            type: "COLUMN",
            user: null,
            path: ADD_COLUMNS_PATH,
            alias: null,
            favoritesUser: "",
            identifier,
            description,
            folder: false,
            properties,
         },
      ],
      table: ADD_COLUMNS_TABLE,
      confirmed: false,
      checkTrap: true,
      sourceChanged: false,
   });
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
   let res = http.get(`${baseUrl}/`, params);

   if (!res.cookies["SESSION"] || !res.cookies["SESSION"][0]) {
      console.log(`Failed to get session for user ${user}. Status: ${res.status}`);
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
   console.log(`VU ${__VU}: Sending cookies: ${cookieHeader.substring(0, 200)}...`);
   const params2 = {
      headers: {
         "Cookie": cookieHeader
      }
   };

   let res2 = ws.connect(url, params2, function (socket) {
      const context: WebsocketContext = {socket, entryID, clientID};

      const applyActionWithCounter = (context: WebsocketContext) => {
         if (ACTION_TYPE === "brush") {
            const brushValue = getBrushValue(context.iterationIdx || 0);
            applyBrush(chartName, brushValue, context, BRUSH_RANGE_SELECTION);
            return;
         }

         if (ACTION_TYPE === "resize-axis") {
            resizeAxis(chartName, RESIZE_AXIS_TYPE, RESIZE_AXIS_FIELD, parseInt(RESIZE_AXIS_SIZE), context);
            return;
         }

         if (ACTION_TYPE === "add-columns") {
            addColumns(ADD_COLUMNS_BODY || buildAddColumnsBody(chartName), context);
            return;
         }

         const selectionValue = getSelectionValue(context.iterationIdx || 0);
         applySelection(selectionListName,
            [{value: selectionValue, selected: true}], context);
      };

      const clearAction = (context: WebsocketContext) => {
         if (ACTION_TYPE === "brush") {
            clearBrush(chartName, context, BRUSH_RANGE_SELECTION);
            return;
         }

         if (ACTION_TYPE === "resize-axis") {
            resizeAxis(chartName, RESIZE_AXIS_TYPE, RESIZE_AXIS_FIELD, parseInt(RESIZE_AXIS_SIZE), context);
            return;
         }

         if (ACTION_TYPE === "add-columns") {
            return;
         }

         clearSelection(selectionListName, context);
      };

      let startTime: number;
      let viewsheetOpenStartTime: number;
      const websocketMessaging = new WebsocketMessaging(socket, context);

      const actionStages = ACTION_TYPE === "brush"
         ? [
            new SendStage(applyActionWithCounter),
            new SendAndListenStage(refreshChartAreas.bind(null, chartName), "SetChartAreasCommand"),
            new SendStage(clearAction),
            new SendAndListenStage(refreshChartAreas.bind(null, chartName), "SetChartAreasCommand"),
         ]
         : ACTION_TYPE === "resize-axis"
         ? [
            new SendStage(applyActionWithCounter),
            new SendAndListenStage(refreshChartAreas.bind(null, chartName), "SetChartAreasCommand"),
            new SendStage(clearAction),
            new SendAndListenStage(refreshChartAreas.bind(null, chartName), "SetChartAreasCommand"),
         ]
         : ACTION_TYPE === "add-columns"
         ? [
            new SendStage(applyActionWithCounter),
            new SendAndListenStage(refreshChartAreas.bind(null, chartName), "SetChartAreasCommand"),
         ]
         : [
            new SendAndListenStage(applyActionWithCounter, "UpdateUndoStateCommand"),
            new SendAndListenStage(refreshChartAreas.bind(null, chartName), "SetChartAreasCommand"),
            new SendAndListenStage(clearAction, "UpdateUndoStateCommand"),
            new SendAndListenStage(refreshChartAreas.bind(null, chartName), "SetChartAreasCommand"),
         ];

      const batchConfig = ACTION_ITERATIONS > 0
         ? {totalIterations: ACTION_ITERATIONS}
         : {durationMs: 3600000};

      websocketMessaging.addStages(
         new SendAndListenStage(sendConnectMessage, "CONNECTED"),
         new SendStage(sendSubscribeMessage),
         new LambdaStage(() => viewsheetOpenStartTime = Date.now()),
         new SendAndListenStage(sendOpenViewsheetCommand, "ClearLoadingCommand"),
         new LambdaStage(() => viewsheetOpenTime.add(Date.now() - viewsheetOpenStartTime)),
         new SendAndListenStage(refreshChartAreas.bind(null, chartName), "SetChartAreasCommand"),
         new BatchStage([
            new LambdaStage(() => startTime = Date.now()),
            ...actionStages,
            new LambdaStage(() => {
               actionCounter.add(1);
               if (ACTION_TYPE === "brush") {
                  brushTime.add(Date.now() - startTime);
               } else if (ACTION_TYPE === "resize-axis") {
                  resizeAxisTime.add(Date.now() - startTime);
               } else if (ACTION_TYPE === "add-columns") {
                  addColumnsTime.add(Date.now() - startTime);
               } else {
                  filterTime.add(Date.now() - startTime);
               }
            }),
            new PauseStage(randomIntBetween(10000, 15000))
         ], batchConfig),
         new SendStage(closeViewsheet)
      );

      socket.on("open", () => {
         websocketMessaging.start();
      });

      setupGenericSocketOnMessage(context);
   });

   check(res2, { "WebSocket connection attempted": (r) => r !== null && r !== undefined });
}
