import { Socket } from "k6/ws";

export interface WebsocketContext {
   socket: Socket;
   entryID: string;
   clientID: string;
   runtimeID?: string;
   iterationIdx?: number
}
