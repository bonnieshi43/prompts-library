import { WebsocketContext } from "../websocket-context";
import { Stage } from "./stage";
import { SendMessageFn } from "./send-stage";

// k6 globals - declare them
declare const __VU: number;
declare const __ENV: { [key: string]: string };

// Helper to format timestamp
function ts(): string {
   const now = new Date();
   return `${now.toISOString().substr(11, 12)}`;
}

interface CommandInfo {
   className: string;
   assemblyName?: string;
   objectName?: string;
}

// Extract command details from message
function extractCommandDetails(message: string): CommandInfo[] {
   const commands: CommandInfo[] = [];

   // Try to parse as JSON array (STOMP message format)
   try {
      // Message format: ["MESSAGE\n...\n\n{json}"]
      const jsonMatch = message.match(/\n\n(.+)$/);
      if (jsonMatch) {
         const jsonStr = jsonMatch[1].replace(/\\"/g, '"').replace(/\u0000/g, '');
         const parsed = JSON.parse(jsonStr);

         // Handle array of commands
         const commandArray = parsed.commands || (Array.isArray(parsed) ? parsed : [parsed]);

         for (const cmd of commandArray) {
            if (cmd && cmd.className) {
               commands.push({
                  className: cmd.className,
                  assemblyName: cmd.assemblyName || cmd.name || cmd.absoluteName,
                  objectName: cmd.objectName || cmd.name
               });
            }
         }
      }
   } catch (e) {
      // Fallback: regex extraction
   }

   // Fallback regex extraction if JSON parsing didn't find commands
   if (commands.length === 0) {
      // Extract className
      const classRegex = /"className":\s*"([^"]+)"/g;
      let match;
      while ((match = classRegex.exec(message)) !== null) {
         const info: CommandInfo = { className: match[1] };

         // Try to find associated assemblyName near this className
         const assemblyMatch = message.match(/"assemblyName":\s*"([^"]+)"/);
         if (assemblyMatch) info.assemblyName = assemblyMatch[1];

         const absoluteNameMatch = message.match(/"absoluteName":\s*"([^"]+)"/);
         if (absoluteNameMatch) info.assemblyName = absoluteNameMatch[1];

         const objectNameMatch = message.match(/"objectName":\s*"([^"]+)"/);
         if (objectNameMatch) info.objectName = objectNameMatch[1];

         commands.push(info);
      }

      // Check for STOMP frames
      if (message.includes("CONNECTED") && commands.length === 0) {
         commands.push({ className: "CONNECTED" });
      }
   }

   return commands;
}

// Format command for display
function formatCommand(cmd: CommandInfo): string {
   let result = cmd.className;
   if (cmd.assemblyName) {
      result += ` [${cmd.assemblyName}]`;
   } else if (cmd.objectName) {
      result += ` [${cmd.objectName}]`;
   }
   return result;
}

export class SendAndListenStageDebug extends Stage {
   private completeFn: () => void;
   private completed = false;
   private stageName: string;

   constructor(private readonly sendMessageFn: SendMessageFn,
               private readonly listenString: string,
               stageName?: string,
               private readonly timeout: number = 300000)
   {
      super();
      this.stageName = stageName || listenString;
   }

   advance(context: WebsocketContext, completeFn: () => void): void {
      this.completeFn = completeFn;

      console.log(`[${ts()}] VU${__VU}: SEND >> waiting for "${this.listenString}"`);
      this.sendMessageFn(context);

      context.socket.setTimeout(() => {
         if(!this.completed) {
            throw new Error("Timed out listening for listenString: " + this.listenString);
         }
      }, this.timeout)
   }

   onMessage(message: string): void {
      const verbose = __ENV.DEBUG_VERBOSE === "true";
      const commands = extractCommandDetails(message);

      // Log all commands received with details
      if (commands.length > 0) {
         for (const cmd of commands) {
            console.log(`[${ts()}] VU${__VU}: RECV << ${formatCommand(cmd)}`);
         }
      } else if (verbose) {
         // No commands extracted, show raw message snippet for debugging
         const snippet = message.substring(0, 200).replace(/\n/g, '\\n');
         console.log(`[${ts()}] VU${__VU}: RECV (raw) << ${snippet}...`);
      }

      if(message.indexOf(this.listenString) >= 0) {
         // Find the matching command and show its details
         const matchingCmd = commands.find(c => c.className.includes(this.listenString));
         if (matchingCmd) {
            console.log(`[${ts()}] VU${__VU}: MATCH ✓ ${formatCommand(matchingCmd)}`);
         } else {
            console.log(`[${ts()}] VU${__VU}: MATCH ✓ "${this.listenString}" found`);
         }

         // In verbose mode, print raw message around the match
         if (verbose) {
            const idx = message.indexOf(this.listenString);
            const start = Math.max(0, idx - 50);
            const end = Math.min(message.length, idx + this.listenString.length + 200);
            const snippet = message.substring(start, end).replace(/\n/g, '\\n');
            console.log(`[${ts()}] VU${__VU}: RAW >> ...${snippet}...`);
         }

         this.completeFn();
         this.completed = true;
      }
      else if(message.indexOf("ExpiredSheetCommand") >= 0) {
         throw new Error("Received an ExpiredSheetCommand.");
      }
   }
}
