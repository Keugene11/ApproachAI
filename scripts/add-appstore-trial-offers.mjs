// Add a 3-day free trial introductory offer to both the monthly and
// yearly App Store subscriptions. Uses the ASC v1 API.

import { readFileSync } from "fs";
import { createSign, createPrivateKey } from "crypto";

const KEY_ID = "6MXUT35K5X";
const ISSUER_ID = "e30fca41-01fd-4020-9b38-9bbde2b0ed44";
const KEY_PATH = "c:/Users/Daniel/Downloads/AuthKey_6MXUT35K5X.p8";
const APP_ID = "6761027246"; // live.wingmate.app
const TARGET_PRODUCT_IDS = ["live.wingmate.app.pro.monthly", "live.wingmate.app.pro.yearly"];

const API = "https://api.appstoreconnect.apple.com/v1";

const privateKey = createPrivateKey(readFileSync(KEY_PATH, "utf8"));

function createJwt() {
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
  const sig = sign.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });
  return `${header}.${payload}.${sig.toString("base64url")}`;
}

const token = createJwt();

async function api(method, path, body) {
  const url = path.startsWith("http") ? path : `${API}${path}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

// Walk app -> subscription groups -> subscriptions
const groups = await api("GET", `/apps/${APP_ID}/subscriptionGroups?limit=50`);
if (!groups.ok) throw new Error(`groups ${groups.status}: ${JSON.stringify(groups.data)}`);

const subs = [];
for (const g of groups.data.data || []) {
  const gs = await api("GET", `/subscriptionGroups/${g.id}/subscriptions?limit=200`);
  if (!gs.ok) throw new Error(`group ${g.id} subs ${gs.status}: ${JSON.stringify(gs.data)}`);
  for (const s of gs.data.data || []) {
    subs.push({
      id: s.id,
      productId: s.attributes?.productId,
      state: s.attributes?.state,
    });
  }
}

console.log("Subscriptions found:");
for (const s of subs) console.log(`  ${s.productId} (${s.id}) [${s.state}]`);

// Fetch all territories — intro offers are per-territory, so we need to
// iterate and create one per sub per territory.
const terrs = [];
let terrUrl = `/territories?limit=200`;
while (terrUrl) {
  const res = await api("GET", terrUrl);
  if (!res.ok) throw new Error(`territories ${res.status}: ${JSON.stringify(res.data)}`);
  for (const t of res.data.data || []) terrs.push(t.id);
  terrUrl = res.data.links?.next ? res.data.links.next.replace("https://api.appstoreconnect.apple.com/v1", "") : null;
}
console.log(`Territories: ${terrs.length}`);

for (const productId of TARGET_PRODUCT_IDS) {
  const sub = subs.find((s) => s.productId === productId);
  if (!sub) { console.log(`\n!! no subscription with productId="${productId}" found`); continue; }
  console.log(`\n=== ${productId} (${sub.id}) ===`);

  const existing = await api("GET", `/subscriptions/${sub.id}/introductoryOffers?limit=200&include=territory`);
  if (!existing.ok) { console.log("  list err", existing.status, existing.data); continue; }
  const all = existing.data.data || [];
  const coveredTerrs = new Set();
  for (const o of all) {
    if (o.attributes?.offerMode === "FREE_TRIAL" && o.attributes?.duration === "THREE_DAYS") {
      const tid = o.relationships?.territory?.data?.id;
      if (tid) coveredTerrs.add(tid);
    }
  }
  console.log(`  ${all.length} existing offers; ${coveredTerrs.size} territories already covered by 3-day free trial`);

  let created = 0, skipped = 0, errored = 0;
  for (const tid of terrs) {
    if (coveredTerrs.has(tid)) { skipped++; continue; }
    const body = {
      data: {
        type: "subscriptionIntroductoryOffers",
        attributes: {
          offerMode: "FREE_TRIAL",
          duration: "THREE_DAYS",
          numberOfPeriods: 1,
          startDate: new Date().toISOString().slice(0, 10),
        },
        relationships: {
          subscription: { data: { type: "subscriptions", id: sub.id } },
          territory: { data: { type: "territories", id: tid } },
        },
      },
    };
    const create = await api("POST", `/subscriptionIntroductoryOffers`, body);
    if (!create.ok) {
      errored++;
      if (errored <= 3) console.log(`  ${tid} err ${create.status}: ${JSON.stringify(create.data).slice(0, 300)}`);
    } else {
      created++;
    }
  }
  console.log(`  created=${created} skipped=${skipped} errored=${errored}`);
}
