/**
 * Configuration for k6 StyleBI load tests.
 *
 * All settings can be overridden via environment variables when running k6.
 *
 * Example usage:
 *   k6 run -e SERVER_IP=localhost -e SERVER_PORT=8080 -e VSNAME=MyDashboard dist/test-d1.js
 */

// Server configuration
export const SERVER_IP = __ENV.SERVER_IP || "localhost";
export const SERVER_PORT = __ENV.SERVER_PORT || "8080";
export const SERVER_PROTOCOL = __ENV.SERVER_PROTOCOL || "http";
export const CONTEXT_PATH = __ENV.CONTEXT_PATH || ""; // Empty for StyleBI, "/sree" for legacy

// Authentication configuration
export const AUTH_USER = __ENV.AUTH_USER || "admin";
export const AUTH_PASSWORD = __ENV.AUTH_PASSWORD || "Admin1234!";
export const USE_MULTI_USER = __ENV.USE_MULTI_USER === "true"; // If true, creates user1, user2, etc.
export const MULTI_USER_PREFIX = __ENV.MULTI_USER_PREFIX || "user";
export const MULTI_USER_PASSWORD = __ENV.MULTI_USER_PASSWORD || "Admin1234!";

// Viewsheet configuration
export const DEFAULT_VSNAME = __ENV.VSNAME || "VSTest1";
export const DEFAULT_ENTRY_ID = __ENV.ENTRY_ID || `1^128^__NULL__^${DEFAULT_VSNAME}`;

// Test timing configuration
export const QUIET_PERIOD = parseTime(__ENV.QUIET_PERIOD || "0");
export const RAMPUP_TIME = parseTime(__ENV.RAMPUP_TIME || __ENV.RAMPUPTIME || "800");
export const USERS = __ENV.USERS || "400";
export const RUN_ONCE = __ENV.RUN_ONCE === "true";

/**
 * Parse a time string into seconds.
 * Supports formats:
 *   - "30" or "30s" = 30 seconds
 *   - "2m" = 2 minutes (120 seconds)
 *   - "1h" = 1 hour (3600 seconds)
 *   - "1m30s" = 1 minute 30 seconds (90 seconds)
 */
export function parseTime(timeStr: string): string {
   if (!timeStr) return "0";

   // If it's just a number, return as-is (already seconds)
   if (/^\d+$/.test(timeStr)) {
      return timeStr;
   }

   let totalSeconds = 0;

   // Match hours
   const hoursMatch = timeStr.match(/(\d+)h/i);
   if (hoursMatch) {
      totalSeconds += parseInt(hoursMatch[1]) * 3600;
   }

   // Match minutes
   const minutesMatch = timeStr.match(/(\d+)m(?!s)/i);
   if (minutesMatch) {
      totalSeconds += parseInt(minutesMatch[1]) * 60;
   }

   // Match seconds
   const secondsMatch = timeStr.match(/(\d+)s/i);
   if (secondsMatch) {
      totalSeconds += parseInt(secondsMatch[1]);
   }

   // If no matches but has a number, treat as seconds
   if (totalSeconds === 0) {
      const numMatch = timeStr.match(/(\d+)/);
      if (numMatch) {
         totalSeconds = parseInt(numMatch[1]);
      }
   }

   return totalSeconds.toString();
}

// Build base URL
export function getBaseUrl(): string {
   return `${SERVER_PROTOCOL}://${SERVER_IP}:${SERVER_PORT}${CONTEXT_PATH}`;
}

// Get user credentials for the current virtual user
export function getUserCredentials(vu: number): { user: string; password: string } {
   if (USE_MULTI_USER) {
      return {
         user: `${MULTI_USER_PREFIX}${vu}`,
         password: MULTI_USER_PASSWORD
      };
   }
   return {
      user: AUTH_USER,
      password: AUTH_PASSWORD
   };
}

// Build viewsheet entry ID
export function getEntryId(vsName?: string): string {
   const name = vsName || DEFAULT_VSNAME;
   return __ENV.ENTRY_ID || `1^128^__NULL__^${name}`;
}

// Selection configuration
export const SELECTION_VALUE = __ENV.SELECTION_VALUE || "";  // Empty = use random fake value
export const SELECTION_VALUES = __ENV.SELECTION_VALUES ? __ENV.SELECTION_VALUES.split(",") : [];  // Comma-separated list to rotate through

// Action configuration
export const ACTION_TYPE = (__ENV.ACTION_TYPE || "filter").toLowerCase(); // filter | brush | resize-axis | add-columns
export const ACTION_ITERATIONS = __ENV.ACTION_ITERATIONS ? parseInt(__ENV.ACTION_ITERATIONS) : 0; // 0 = loop for scenario duration
export const BRUSH_VALUE = __ENV.BRUSH_VALUE || "";
export const BRUSH_VALUES = __ENV.BRUSH_VALUES ? __ENV.BRUSH_VALUES.split(",") : [];
export const BRUSH_INDEX = __ENV.BRUSH_INDEX || "";
export const BRUSH_LABEL = __ENV.BRUSH_LABEL || __ENV.CHART_BRUSH_LABEL || "Median Income";
export const BRUSH_RANGE_SELECTION = __ENV.BRUSH_RANGE_SELECTION === "true";

export const RESIZE_AXIS_TYPE = __ENV.RESIZE_AXIS_TYPE || "y"; // x | y
export const RESIZE_AXIS_FIELD = __ENV.RESIZE_AXIS_FIELD || "Median Income";
export const RESIZE_AXIS_SIZE = __ENV.RESIZE_AXIS_SIZE || "69";

export const OPEN_VIEWER = __ENV.OPEN_VIEWER !== "false";

export const ADD_COLUMNS_BODY = __ENV.ADD_COLUMNS_BODY || "";
export const ADD_COLUMNS_PATH = __ENV.ADD_COLUMNS_PATH || "";
export const ADD_COLUMNS_TABLE = __ENV.ADD_COLUMNS_TABLE || "";
export const ADD_COLUMNS_IDENTIFIER = __ENV.ADD_COLUMNS_IDENTIFIER || "";
export const ADD_COLUMNS_DESCRIPTION = __ENV.ADD_COLUMNS_DESCRIPTION || "";

export const ADD_COLUMNS_ASSEMBLY = __ENV.ADD_COLUMNS_ASSEMBLY || "";
export const ADD_COLUMNS_DTYPE = __ENV.ADD_COLUMNS_DTYPE || "";
export const ADD_COLUMNS_SOURCE = __ENV.ADD_COLUMNS_SOURCE || "";
export const ADD_COLUMNS_ATTRIBUTE = __ENV.ADD_COLUMNS_ATTRIBUTE || "";
export const ADD_COLUMNS_TYPE = __ENV.ADD_COLUMNS_TYPE || "";
export const ADD_COLUMNS_TOOLTIP = __ENV.ADD_COLUMNS_TOOLTIP || "";
export const ADD_COLUMNS_EXPRESSION = __ENV.ADD_COLUMNS_EXPRESSION || "false";
export const ADD_COLUMNS_EMBEDDED = __ENV.ADD_COLUMNS_EMBEDDED || "false";
export const ADD_COLUMNS_ISCALC = __ENV.ADD_COLUMNS_ISCALC || "false";

// Get selection value for a given iteration
export function getSelectionValue(iterationIdx: number): string[] {
   // If specific values provided, rotate through them
   if (SELECTION_VALUES.length > 0) {
      const value = SELECTION_VALUES[iterationIdx % SELECTION_VALUES.length];
      return [value];
   }
   // If single value provided, use it
   if (SELECTION_VALUE) {
      return [SELECTION_VALUE];
   }
   // Default: fake value (won't match real data)
   return ["madeUpValue" + iterationIdx];
}

// Get brush value for a given iteration
export function getBrushValue(iterationIdx: number): string {
   if (BRUSH_VALUES.length > 0) {
      return BRUSH_VALUES[iterationIdx % BRUSH_VALUES.length];
   }
   if (BRUSH_VALUE) {
      return BRUSH_VALUE;
   }
   if (BRUSH_INDEX !== "") {
      return `${BRUSH_LABEL}^INDEX:${BRUSH_INDEX}`;
   }
   return `${BRUSH_LABEL}^INDEX:${iterationIdx % 20}`;
}
