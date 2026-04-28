import http from "k6/http";
import { check, sleep } from "k6";
import { b64encode } from "k6/encoding";
import {
   AUTH_USER,
   AUTH_PASSWORD,
   MULTI_USER_PREFIX,
   MULTI_USER_PASSWORD,
   getBaseUrl,
} from "./config";

/**
 * Setup script to create test users in StyleBI.
 *
 * Usage:
 *   k6 run -e USER_COUNT=10 dist/setup-users.js
 *
 * This creates users: user1, user2, ... user10 with password from MULTI_USER_PASSWORD
 */

const USER_COUNT = parseInt(__ENV.USER_COUNT || "10");

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

   // First, get a session by hitting the EM
   let sessionRes = http.get(`${baseUrl}/em`, { headers });

   if (!sessionRes.cookies["SESSION"] || !sessionRes.cookies["SESSION"][0]) {
      console.log(`Failed to get session. Status: ${sessionRes.status}`);
      return;
   }

   const sessionCookie = sessionRes.cookies["SESSION"][0].value;

   // Get XSRF token
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

   // Get the list of authentication providers
   const providersRes = http.get(
      `${baseUrl}/api/em/security/configured-authentication-providers`,
      { headers: authHeaders }
   );

   if (providersRes.status !== 200) {
      console.log(`Failed to get providers. Status: ${providersRes.status}`);
      return;
   }

   const providersData = JSON.parse(providersRes.body as string);

   if (!providersData.providers || providersData.providers.length === 0) {
      console.log("No authentication providers found");
      return;
   }

   // Use the first provider (usually the default one)
   const providerName = providersData.providers[0].name;
   const encodedProvider = encodeURIComponent(providerName);

   console.log(`Using provider: ${providerName}`);
   console.log(`Creating ${USER_COUNT} test users...`);

   for (let i = 1; i <= USER_COUNT; i++) {
      const username = `${MULTI_USER_PREFIX}${i}`;

      // Step 1: Create user (get template)
      const createRes = http.post(
         `${baseUrl}/api/em/security/users/create-user/${encodedProvider}`,
         JSON.stringify({ parentGroup: null }),
         { headers: authHeaders }
      );

      if (createRes.status !== 200) {
         console.log(`Failed to create user template for ${username}. Status: ${createRes.status}, Body: ${createRes.body}`);
         continue;
      }

      // Parse the template returned by create-user to get the oldName the server assigned
      let oldName = "";
      try {
         const templateData = JSON.parse(createRes.body as string);
         // The server returns the template with name field; use it as oldName for edit-user
         oldName = templateData.name !== undefined ? templateData.name : "";
         console.log(`Template oldName for ${username}: "${oldName}"`);
      } catch (e) {
         oldName = "";
      }

      // Step 2: Edit user with actual details
      const userModel = {
         name: username,
         oldName: oldName,
         label: username,
         password: MULTI_USER_PASSWORD,
         status: true,
         alias: "",
         email: `${username}@test.local`,
         locale: "",
         roles: [],
         members: [],
         identityNames: [],
         permittedIdentities: [],
         editable: true,
         root: false,
         currentUser: false,
         localesList: [],
         supportChangePassword: true,
         theme: null,
      };

      const editRes = http.post(
         `${baseUrl}/api/em/security/users/edit-user/${encodedProvider}`,
         JSON.stringify(userModel),
         { headers: authHeaders }
      );

      if (editRes.status === 200) {
         console.log(`Created user: ${username}`);
      } else {
         console.log(`Failed to save user ${username}. Status: ${editRes.status}, Body: ${editRes.body}`);
      }

      // Small delay to avoid overwhelming the server
      sleep(0.1);
   }

   console.log(`Done creating ${USER_COUNT} users.`);
}
