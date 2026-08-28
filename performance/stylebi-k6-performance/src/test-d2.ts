import http, { RefinedParams } from "k6/http";
import ws from "k6/ws";
import { check, sleep } from "k6";

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
   RESIZE_AXIS_FIELD,
   RESIZE_AXIS_SIZE,
   RESIZE_AXIS_TYPE,
   getBrushValue,
   getUserCredentials,
   getBaseUrl,
   getSelectionValue,
} from "./config";

const TARGET_USERS = parseInt(__ENV.USERS || "10");
const RAMPUP_SECS = parseInt(__ENV.RAMPUP_TIME || "30");
const MIN_RAMPUP_SECS = TARGET_USERS * 2;
const effectiveRampup = Math.max(RAMPUP_SECS, MIN_RAMPUP_SECS);

export let options = {
  summaryTimeUnit: 'ms',
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'count'],
  noConnectionReuse: false,
  noVUConnectionReuse: false,
  scenarios: {
    main: {
      executor: 'ramping-vus',
      exec: `${__ENV.TEST_FUNCTION}`,
      startTime: '0s',
      gracefulStop: '30s',
      stages: [
        { duration: `${effectiveRampup}s`, target: TARGET_USERS },
        { duration: '30s', target: TARGET_USERS },
        { duration: '30s', target: 0 },
        { duration: `${QUIET_PERIOD}s`, target: 0 },
      ],
      gracefulRampDown: "30s"
    },
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

const vuSessionCache: { [vu: number]: string } = {};

function getOrCreateSession(user: string, password: string, vu: number): string | null {
   if (vuSessionCache[vu]) {
      return vuSessionCache[vu];
   }

   const baseUrl = getBaseUrl();
   const params: RefinedParams<any> = {
      headers: {
         "Authorization": `Basic ${b64encode(`${user}:${password}`)}`,
         "LoginAsUser": user,
      },
   };

   const res = http.get(`${baseUrl}/em`, params);

   if (!res.cookies["SESSION"] || !res.cookies["SESSION"][0]) {
      console.log(`Failed to get session for user ${user}. Status: ${res.status}`);
      return null;
   }

   let cookieHeader = `SESSION=${res.cookies["SESSION"][0].value}`;
   if (res.cookies["SERVERID"] && res.cookies["SERVERID"][0]) {
      cookieHeader += `; SERVERID=${res.cookies["SERVERID"][0].value}`;
   }
   for (const cookieName of Object.keys(res.cookies)) {
      if (cookieName.startsWith("AWSALB")) {
         cookieHeader += `; ${cookieName}=${res.cookies[cookieName][0].value}`;
      }
   }

   vuSessionCache[vu] = cookieHeader;
   return cookieHeader;
}

function runTest(entryID: string, chartNames: string[], selectionListName: string) {
   const { user, password } = getUserCredentials(__VU);
   const clientID = uuidv4();

   const cookieHeader = getOrCreateSession(user, password, __VU);
   if (!cookieHeader) {
      sleep(5);
      return;
   }

   const url = buildWebsocketURL();
   const params2 = {
      headers: {
         "Cookie": cookieHeader,
         "Authorization": `Basic ${b64encode(`${user}:${password}`)}`,
         "LoginAsUser": user,
      },
   };

   let res2 = ws.connect(url, params2, function (socket) {
      const context: WebsocketContext = {socket, entryID, clientID};

      const applyActionWithCounter = (context: WebsocketContext) => {
         if (ACTION_TYPE === "brush") {
            const brushValue = getBrushValue(context.iterationIdx || 0);
            applyBrush(chartNames[0], brushValue, context, BRUSH_RANGE_SELECTION);
            return;
         }

         if (ACTION_TYPE === "resize-axis") {
            resizeAxis(chartNames[0], RESIZE_AXIS_TYPE, RESIZE_AXIS_FIELD, parseInt(RESIZE_AXIS_SIZE), context);
            return;
         }

         if (ACTION_TYPE === "add-columns") {
            addColumns(ADD_COLUMNS_BODY || buildAddColumnsBody(chartNames[0]), context);
            return;
         }

         const selectionValue = getSelectionValue(context.iterationIdx || 0);
         applySelection(selectionListName,
            [{value: selectionValue, selected: true}], context);
      };

      const clearAction = (context: WebsocketContext) => {
         if (ACTION_TYPE === "brush") {
            clearBrush(chartNames[0], context, BRUSH_RANGE_SELECTION);
            return;
         }

         if (ACTION_TYPE === "resize-axis") {
            resizeAxis(chartNames[0], RESIZE_AXIS_TYPE, RESIZE_AXIS_FIELD, parseInt(RESIZE_AXIS_SIZE), context);
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
      const initialChartRefreshStages = chartNames.map(name =>
         new SendAndListenStage(refreshChartAreas.bind(null, name), "SetChartAreasCommand")
      );
      const chartRefreshStages = chartNames.map(name =>
         new SendAndListenStage(refreshChartAreas.bind(null, name), "SetChartAreasCommand")
      );

      const actionStages = ACTION_TYPE === "brush"
         ? [
            new SendStage(applyActionWithCounter),
            ...chartRefreshStages,
            new SendStage(clearAction),
            ...chartRefreshStages,
         ]
         : ACTION_TYPE === "resize-axis"
         ? [
            new SendStage(applyActionWithCounter),
            ...chartRefreshStages,
            new SendStage(clearAction),
            ...chartRefreshStages,
         ]
         : ACTION_TYPE === "add-columns"
         ? [
            new SendStage(applyActionWithCounter),
            ...chartRefreshStages,
         ]
         : [
            new SendAndListenStage(applyActionWithCounter, "AddVSObjectCommand"),
            ...chartRefreshStages,
            new SendAndListenStage(clearAction, "AddVSObjectCommand"),
            ...chartRefreshStages,
         ];

      websocketMessaging.addStages(
         new SendAndListenStage(sendConnectMessage, "CONNECTED"),
         new SendStage(sendSubscribeMessage),
         new LambdaStage(() => viewsheetOpenStartTime = Date.now()),
         new SendAndListenStage(sendOpenViewsheetCommand, "ClearLoadingCommand"),
         new LambdaStage(() => viewsheetOpenTime.add(Date.now() - viewsheetOpenStartTime)),
         ...initialChartRefreshStages,
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
         ], {durationMs: 3600000}),
         new SendStage(closeViewsheet)
      );

      socket.on("open", () => {
         websocketMessaging.start();
      });

      setupGenericSocketOnMessage(context);
   });

   const wsOk = res2 && res2.status === 101;
   check(res2, { "status is 101": () => wsOk });

   if (!wsOk) {
      console.log(`WS handshake failed for ${user}. status=${res2 ? res2.status : "null"}`);
   }

   if (!wsOk) {
      delete vuSessionCache[__VU];
      sleep(3);
   }
}

export function twoChart() {
   const vsName = __ENV.VSNAME_2CHART || "VSTest2C1S";
   const entryID = __ENV.ENTRY_ID_2CHART || `1^128^__NULL__^${vsName}`;
   const chartName = __ENV.CHART_NAME || "Chart2";
   const selectionName = __ENV.SELECTION_NAME || "SelectionList1";
   runTest(entryID, ["Chart1", chartName], selectionName);
}

export function threeChart() {
   const vsName = __ENV.VSNAME_3CHART || "VSTest3C1S";
   const entryID = __ENV.ENTRY_ID_3CHART || `1^128^__NULL__^${vsName}`;
   runTest(entryID, ["Chart1", "Chart2", "Chart3"], "SelectionList1");
}

export function fourChart() {
   const vsName = __ENV.VSNAME_4CHART || "VSTest4C1S";
   const entryID = __ENV.ENTRY_ID_4CHART || `1^128^__NULL__^${vsName}`;
   runTest(entryID, ["Chart1", "Chart2", "Chart3", "Chart4"], "SelectionList1");
}

export function fourChart4Sel() {
   const vsName = __ENV.VSNAME_4CHART4SEL || "VSTest4C4S";
   const entryID = __ENV.ENTRY_ID_4CHART4SEL || `1^128^__NULL__^${vsName}`;
   runTest(entryID, ["Chart1", "Chart2", "Chart3", "Chart4"], "SelectionList1");
}
