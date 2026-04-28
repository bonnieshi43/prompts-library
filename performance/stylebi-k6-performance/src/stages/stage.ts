import { WebsocketContext } from "../websocket-context";

export abstract class Stage {
   abstract advance(context: WebsocketContext, completeFn: () => void): void;
   abstract onMessage(message: string): void;
}
