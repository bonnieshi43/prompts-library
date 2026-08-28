import { WebsocketContext } from "../websocket-context";
import { Stage } from "./stage";
import { SendMessageFn } from "./send-stage";

export class SendAndListenStage extends Stage {
   private completeFn: () => void;
   private completed = false;

   constructor(private readonly sendMessageFn: SendMessageFn,
               private readonly listenString: string,
               private readonly timeout: number = 300000)
   {
      super();
   }

   advance(context: WebsocketContext, completeFn: () => void): void {
      this.completeFn = completeFn;
      this.sendMessageFn(context);

      context.socket.setTimeout(() => {
         if(!this.completed) {
            throw new Error("Timed out listening for listenString: " + this.listenString);
         }
      }, this.timeout)
   }

   onMessage(message: string): void {
      if(message.indexOf(this.listenString) >= 0) {
         this.completeFn();
         this.completed = true;
      }
      else if(message.indexOf("ExpiredSheetCommand") >= 0) {
         throw new Error("Received an ExpiredSheetCommand.");
      }
   }
}
