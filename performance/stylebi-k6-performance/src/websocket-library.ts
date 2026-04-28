import { WebsocketContext } from "./websocket-context";
import { SERVER_IP, SERVER_PORT, SERVER_PROTOCOL, CONTEXT_PATH, OPEN_VIEWER } from "./config";

export function buildWebsocketURL(serverIP?: string, serverPort?: string): string {
   const ip = serverIP || SERVER_IP;
   const port = serverPort || SERVER_PORT;
   const contextPath = CONTEXT_PATH;
   const wsProtocol = SERVER_PROTOCOL === "https" ? "wss" : "ws";
   const firstPath = Math.floor(Math.random() * 1000);
   const secondPath = (Math.random() + 1).toString(36).substring(5);

   return `${wsProtocol}://${ip}:${port}${contextPath}/vs-events/${firstPath}/${secondPath}/websocket`;
}

export function setupGenericSocketOnMessage(context: WebsocketContext): void {
   context.socket.on("message", (message) => {
      if (message === "h" && context.runtimeID != null) {
         sendTouchAssetEvent(context);
      }

      if (context.runtimeID == null) {
         const runtimeID = extractRuntimeID(message);

         if (runtimeID != null) {
            context.runtimeID = runtimeID;
         }
      }

      if (message.indexOf("MessageCommand") >= 0) {
         let match = message.match("\\\\\"message\\\\\":\\\\\"(.+?)\\\\\"");

         if (match != null) {
            console.log(`MessageCommand: ${match[1]}`);
         }
      }
   });
}

export function sendConnectMessage(context: WebsocketContext): void {
   context.socket.send("[\"CONNECT\\naccept-version:1.1,1.0\\nheart-beat:10000,10000\\n\\n\\u0000\"]");
}

export function sendSubscribeMessage(context: WebsocketContext): void {
   context.socket.send("[\"SUBSCRIBE\\nid:sub-0\\ndestination:/user/commands\\n\\n\\u0000\"]");
}

export function sendOpenViewsheetCommand(context: WebsocketContext): void {
   const { socket, clientID, entryID } = context;
   const viewerValue = OPEN_VIEWER ? "true" : "false";

   socket.send(
      `[` +
      `"SEND\\ninetsoftClientId:${clientID}\\nfocusedLayoutName:Master\\ndestination:/events/open\\n\\n` +
      `{\\"drillFrom\\":null,\\"sync\\":false,\\"fullScreenId\\":null,\\"runtimeViewsheetId\\":null,\\"embeddedViewsheetId\\":null,\\"viewer\\":${viewerValue},\\"openAutoSaved\\":false,\\"confirmed\\":false,\\"previousUrl\\":null,\\"bookmarkName\\":null,\\"bookmarkUser\\":null,\\"disableParameterSheet\\":false,\\"parameters\\":{},\\"scale\\":1,\\"manualRefresh\\":false,\\"hyperlinkSourceId\\":null,\\"meta\\":false,\\"newSheet\\":false,\\"layoutName\\":null,\\"embedAssemblyName\\":null,\\"embedAssemblySize\\":null,\\"entryId\\":\\"${entryID}\\",\\"width\\":891,\\"height\\":703,\\"mobile\\":false,\\"userAgent\\":\\"Mozilla/5.0...\\"}\\u0000"` +
      `]`
   );
}

export function sendTouchAssetEvent(context: WebsocketContext): void {
   const { socket, clientID, runtimeID } = context;
   socket.send(
      `[` +
      `"SEND\\ninetsoftClientId:${clientID}\\nsheetRuntimeId:${runtimeID}\\nfocusedLayoutName:Master\\ndestination:/events/composer/touch-asset\\n\\n` +
      `{\\"width\\":0,\\"height\\":0,\\"design\\":false,\\"changed\\":false,\\"update\\":false}\\u0000"` +
      `]`
   );
}

export function extractRuntimeID(message: string): string | null {
   const match = message.match("sheetRuntimeId:(.+?)\\\\n");

   if (match != null) {
      return match[1];
   }

   return null;
}

export function refreshChartAreas(chartName: string, context: WebsocketContext): void {
   sendEvent("/events/vschart/areas", `{"chartName":"${chartName}"}`, context);
}

export function applySelection(selectionListName: string, values: Value[], context: WebsocketContext): void {
   const data = `{"type":"APPLY","values":${JSON.stringify(values)},"selectStart":-1,"selectEnd":-1,"eventSource":"${selectionListName}","toggle":false,"toggleAll":false}`;
   sendEvent(`/events/selectionList/update/${selectionListName}`, data, context);
}

export function clearSelection(selectionListName: string, context: WebsocketContext): void {
   const data = `{"type":"APPLY","values":null,"selectStart":-1,"selectEnd":-1,"eventSource":"${selectionListName}","toggle":false,"toggleAll":false}`;
   sendEvent(`/events/selectionList/update/${selectionListName}`, data, context);
}

export function applyBrush(chartName: string, selected: string, context: WebsocketContext, rangeSelection: boolean = false): void {
   const data = `{"viewportWidth":0,"viewportHeight":0,"chartName":"${chartName}","selected":"${escapeJsonValue(selected)}","rangeSelection":${rangeSelection}}`;
   sendEvent("/events/vschart/brush", data, context);
}

export function clearBrush(chartName: string, context: WebsocketContext, rangeSelection: boolean = false): void {
   const data = `{"viewportWidth":0,"viewportHeight":0,"chartName":"${chartName}","selected":"","rangeSelection":${rangeSelection}}`;
   sendEvent("/events/vschart/brush", data, context);
}

export function resizeAxis(chartName: string, axisType: string, axisField: string, axisSize: number, context: WebsocketContext): void {
   const data = `{"viewportWidth":0,"viewportHeight":0,"chartName":"${chartName}","axisType":"${escapeJsonValue(axisType)}","axisField":"${escapeJsonValue(axisField)}","axisSize":${axisSize}}`;
   sendEvent("/events/vschart/resize-axis", data, context);
}

export function addColumns(body: string, context: WebsocketContext): void {
   sendEvent("/events/vschart/dnd/addColumns", body, context);
}

export function closeViewsheet(context: WebsocketContext): void {
   const { socket, clientID, runtimeID } = context;
   socket.send(
      `[` +
      `"SEND\\ninetsoftClientId:${clientID}\\nsheetRuntimeId:${runtimeID}focusedLayoutName:Master\\ndestination:/events/composer/viewsheet/close\\n\\n{}\\u0000"` +
      `]`
   );
}

function sendEvent(destination: string, body: string, context: WebsocketContext): void {
   const { socket, clientID, runtimeID } = context;
   const escapedBody = body.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
   socket.send(
      `[` +
      `"SEND\\ninetsoftClientId:${clientID}\\nsheetRuntimeId:${runtimeID}\\nfocusedLayoutName:Master\\ndestination:${destination}\\ncontent-length:${body.length}\\n\\n${escapedBody}\\u0000"` +
      `]`
   );
}

function escapeJsonValue(value: string): string {
   return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

interface Value {
   value: string[];
   selected: boolean;
}
