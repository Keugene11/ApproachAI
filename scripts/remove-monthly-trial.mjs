// Remove the 3-day free trial from the MONTHLY subscription only.
// Keeps the yearly offer intact.

import { readFileSync } from "fs";
import { createSign, createPrivateKey } from "crypto";

// --- Google Play ---
const SA_PATH_PLAY = "c:/Users/Daniel/Downloads/voicenote-pro-484818-6d6db67c7fdb.json";
const PACKAGE_NAME = "com.approachai.twa";
const PLAY_API = "https://androidpublisher.googleapis.com/androidpublisher/v3";
const PLAY_OFFER_ID = "free-trial-3d";

const sa = JSON.parse(readFileSync(SA_PATH_PLAY, "utf8"));

function playJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  })).toString("base64url");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  return `${header}.${payload}.${sign.sign(sa.private_key, "base64url")}`;
}
async function playToken() {
  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${playJwt()}`,
  });
  const { access_token } = await res.json();
  return access_token;
}
async function playApi(token, method, path, body) {
  const res = await fetch(`${PLAY_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

// --- App Store Connect ---
const KEY_ID = "6MXUT35K5X";
const ISSUER_ID = "e30fca41-01fd-4020-9b38-9bbde2b0ed44";
const KEY_PATH = "c:/Users/Daniel/Downloads/AuthKey_6MXUT35K5X.p8";
const ASC_API = "https://api.appstoreconnect.apple.com/v1";
const ASC_MONTHLY_SUB_ID = "6761561505"; // live.wingmate.app.pro.monthly

const ascKey = createPrivateKey(readFileSync(KEY_PATH, "utf8"));

function ascJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: KEY_ID, typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: ISSUER_ID,
    iat: now,
    exp: now + 1200,
    aud: "appstoreconnect-v1",
  })).toString("base64url");
  const sign = createSign("SHA256");
  sign.update(`${header}.${payload}`);
  const sig = sign.sign({ key: ascKey, dsaEncoding: "ieee-p1363" });
  return `${header}.${payload}.${sig.toString("base64url")}`;
}
const ascToken = ascJwt();
async function ascApi(method, path) {
  const res = await fetch(path.startsWith("http") ? path : `${ASC_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${ascToken}`, "Content-Type": "application/json" },
  });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

// --- PLAY: deactivate then delete the monthly offer ---
console.log("== Google Play ==");
const pToken = await playToken();
const productId = "monthly";
const basePlanId = "monthly-autorenewing";
const deact = await playApi(pToken, "POST", `/applications/${PACKAGE_NAME}/subscriptions/${productId}/basePlans/${basePlanId}/offers/${PLAY_OFFER_ID}:deactivate`, {});
console.log(`  deactivate ${deact.status}`);
const del = await playApi(pToken, "DELETE", `/applications/${PACKAGE_NAME}/subscriptions/${productId}/basePlans/${basePlanId}/offers/${PLAY_OFFER_ID}`);
console.log(`  delete ${del.status}`);

// --- ASC: delete all intro offers on the monthly subscription ---
console.log("\n== App Store ==");
let allOffers = [];
let url = `/subscriptions/${ASC_MONTHLY_SUB_ID}/introductoryOffers?limit=200`;
while (url) {
  const res = await ascApi("GET", url);
  if (!res.ok) { console.log("  list err:", res.data); break; }
  for (const o of res.data.data || []) allOffers.push(o.id);
  url = res.data.links?.next ? res.data.links.next.replace("https://api.appstoreconnect.apple.com/v1", "") : null;
}
console.log(`  ${allOffers.length} intro offers to delete`);
let deleted = 0, errored = 0;
for (const id of allOffers) {
  const res = await ascApi("DELETE", `/subscriptionIntroductoryOffers/${id}`);
  if (res.ok) deleted++;
  else {
    errored++;
    if (errored <= 3) console.log(`    ${id} err ${res.status}: ${JSON.stringify(res.data).slice(0, 200)}`);
  }
}
console.log(`  deleted=${deleted} errored=${errored}`);
