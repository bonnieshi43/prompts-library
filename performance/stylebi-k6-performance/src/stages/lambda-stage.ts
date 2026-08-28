import { WebsocketContext } from "../websocket-context";
import { Stage } from "./stage";

export class LambdaStage extends Stage {
   constructor(private readonly fn: () => void) {
      super();
   }

   advance(context: WebsocketContext, completeFn: () => void): void {
      this.fn();
      completeFn();
   }

   onMessage(message: string): void {
      // no-op
   }
}
