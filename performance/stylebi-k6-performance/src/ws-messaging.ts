/**
 * Want:
 *
 * messaging(event: openViewsheet, until: ClearLoadingCommand)
 *   .messaging(event: refreshChartAreas, until: SetChartAreasCommand)
 *   .batch(n times,
 *       messaging(event: applySelection, until: UpdateUndoStateCommand)
 *       messaging(event: refreshChartAreas, until: SetChartAreasCommand)
 *       messaging(event: clearSelection, until: UpdateUndoStateCommand)
 *       messaging(event: refreshChartAreas, until: SetChartAreasCommand)
 *       pause(t ms)
 * messaging(event: closeViewsheet)
 *   )
 */
import { Socket } from "k6/ws";
import { WebsocketContext } from "./websocket-context";
import { Stage } from "./stages/stage";

export class WebsocketMessaging {
   private readonly stages: Stage[] = [];
   private stageIdx = -1;
   private readonly completeFn = () => this.nextStage();

   constructor(private readonly socket: Socket, private readonly context: WebsocketContext) {
   }

   start(): void {
      this.nextStage();

      this.socket.on("message", (message) => {
         this.currentStage.onMessage(message);
      });
   }

   private nextStage(): void {
      this.stageIdx++;

      if(this.stageIdx >= this.stages.length) {
         this.socket.close();
         return;
      }

      this.currentStage.advance(this.context, this.completeFn);
   }

   private get currentStage(): Stage {
      return this.stages[this.stageIdx];
   }

   addStages(...stages: Stage[]): WebsocketMessaging {
      this.stages.push(...stages);
      return this;
   }
}
