import { WebsocketContext } from "../websocket-context";
import { Stage } from "./stage";

export class SendStage extends Stage {
   constructor(private readonly sendMessageFn: SendMessageFn) {
      super();
   }

   advance(context: WebsocketContext, completeFn: () => void): void {
      this.sendMessageFn(context);
      completeFn();
   }

   onMessage(message: string): void {
      // no-op
   }
}

export type SendMessageFn = (context: WebsocketContext) => void;
