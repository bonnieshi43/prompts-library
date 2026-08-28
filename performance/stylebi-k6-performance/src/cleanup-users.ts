import http from "k6/http";
import { sleep } from "k6";
import { b64encode } from "k6/encoding";
import {
   AUTH_USER,
   AUTH_PASSWORD,
   MULTI_USER_PREFIX,
   getBaseUrl,
} from "./config";

/**
 * Cleanup script to delete test users from StyleBI.
 *
 * Usage:
 *   k6 run -e USER_COUNT=10 dist/cleanup-users.js
 */

const USER_COUNT = parseInt(__ENV.USER_COUNT || "10");
const PROVIDER = __ENV.PROVIDER || "Internal%20Security%20Provider";
const ORG_ID = __ENV.ORG_ID || "host-org";

export let options = {
   vus: 1,
   iterations: 1,
};

export default function () {
   const baseUrl = getBaseUrl();
   const adminAuth = b64encode(`${AUTH_USER}:${AUTH_PASSWORD}`);

   const headers = {
      "Authorization": `Basic ${adminAuth}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
   };

   // Get session
   let sessionRes = http.get(`${baseUrl}/em`, { headers });

   if (!sessionRes.cookies["SESSION"] || !sessionRes.cookies["SESSION"][0]) {
      console.log(`Failed to get session. Status: ${sessionRes.status}`);
      return;
   }

   const sessionCookie = sessionRes.cookies["SESSION"][0].value;

   let xsrfToken = "";
   if (sessionRes.cookies["XSRF-TOKEN"] && sessionRes.cookies["XSRF-TOKEN"][0]) {
      xsrfToken = sessionRes.cookies["XSRF-TOKEN"][0].value;
   }

   const authHeaders = {
      "Authorization": `Basic ${adminAuth}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Cookie": `SESSION=${sessionCookie}${xsrfToken ? "; XSRF-TOKEN=" + xsrfToken : ""}`,
      "X-XSRF-TOKEN": xsrfToken,
   };

   console.log(`Deleting ${USER_COUNT} test users...`);

   for (let i = 1; i <= USER_COUNT; i++) {
      const username = `${MULTI_USER_PREFIX}${i}`;
      // IdentityID key format: name:::orgId
      const identityKey = encodeURIComponent(`${username}:::${ORG_ID}`);

      const deleteRes = http.del(
         `${baseUrl}/api/em/security/providers/${PROVIDER}/users/${identityKey}/`,
         null,
         { headers: authHeaders }
      );

      if (deleteRes.status === 200) {
         console.log(`Deleted user: ${username}`);
      } else {
         console.log(`Failed to delete ${username}. Status: ${deleteRes.status}`);
      }

      sleep(0.1);
   }

   console.log(`Done deleting ${USER_COUNT} users.`);
}
