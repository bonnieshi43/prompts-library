import { WebsocketContext } from "../websocket-context";
import { Stage } from "./stage";

export class PauseStage extends Stage {
   constructor(private readonly sleepTime: number) {
      super();
   }

   advance(context: WebsocketContext, completeFn: () => void): void {
      context.socket.setTimeout(completeFn, this.sleepTime);
   }

   onMessage(message: string): void {
      // no-op
   }
}
