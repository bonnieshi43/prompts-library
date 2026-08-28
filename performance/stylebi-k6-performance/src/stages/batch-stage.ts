import { WebsocketContext } from "../websocket-context";
import { Stage } from "./stage";

export class BatchStage extends Stage {
   private currentIteration = -1; // zero-based
   private startTime = -1;
   private stageIdx = -1;
   private completeFn: () => void;
   private readonly batchCompleteFn = () => this.advance(this.context, this.completeFn);
   private context: WebsocketContext;

   constructor(private readonly stages: Stage[],
               private readonly config: BatchConfig)
   {
      super();
   }

   private get currentStage(): Stage {
      return this.stages[this.stageIdx];
   }

   advance(context: WebsocketContext, completeFn: () => void): void {
      this.completeFn = completeFn;
      this.context = {...context, iterationIdx: this.currentIteration};
      this.stageIdx++;

      if(this.stageIdx >= this.stages.length || this.currentIteration === -1) {
         this.nextIteration();
      }

      if(this.isComplete()) {
         completeFn();
         return;
      }

      // console.log(`Batch current iteration: ${this.currentIteration}`);
      // console.warn(`Batch current stage: ${this.stageIdx}`);
      // console.log(`Batch current stage: ${this.currentStage}`);
      this.currentStage.advance(this.context, this.batchCompleteFn);
   }

   onMessage(message: string): void {
      this.currentStage.onMessage(message);
   }

   private nextIteration(): void {
      this.currentIteration++;

      if(this.startTime === -1) {
         this.startTime = Date.now();
      }

      if(!this.isComplete()) {
         this.stageIdx = 0;
      }
   }

   private isComplete(): boolean {
      if(this.config.totalIterations != null) {
         return this.currentIteration >= this.config.totalIterations;
      }
      else if(this.config.durationMs != null) {
         return Date.now() - this.startTime >= this.config.durationMs;
      }

      throw new Error("Invalid batch config");
   }
}

interface BatchConfig {
   readonly totalIterations?: number;
   readonly durationMs?: number;
}
