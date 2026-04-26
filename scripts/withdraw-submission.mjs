// Withdraw the current App Store version from review so screenshots,
// metadata, etc. can be edited again. Moves the version back to
// PREPARE_FOR_SUBMISSION. Use ./resubmit-version.mjs to put it back in
// the queue.

import { readFileSync } from "fs";
import { createSign } from "crypto";

const KEY_PATH = "C:/Users/Daniel/Downloads/AuthKey_6MXUT35K5X.p8";
const KEY_ID = "6MXUT35K5X";
const ISSUER = "e30fca41-01fd-4020-9b38-9bbde2b0ed44";
const APP_ID = "6761027246";

function jwt() {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 1200;
  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: KEY_ID, typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ iss: ISSUER, iat: now, exp, aud: "appstoreconnect-v1" })).toString("base64url");
  const key = readFileSync(KEY_PATH, "utf8");
  const sig = createSign("SHA256")
    .update(header + "." + payload)
    .sign({ key, dsaEncoding: "ieee-p1363" })
    .toString("base64url");
  return header + "." + payload + "." + sig;
}

const BASE = "https://api.appstoreconnect.apple.com/v1";

async function api(method, route, body) {
  const res = await fetch(`${BASE}/${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt()}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${route} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

async function main() {
  const r = await api(
    "GET",
    `apps/${APP_ID}/appStoreVersions?limit=10&fields[appStoreVersions]=versionString,appStoreState,appVersionState`,
  );
  const inReview = r.data.find((v) => {
    const s = v.attributes.appVersionState || v.attributes.appStoreState;
    return ["WAITING_FOR_REVIEW", "IN_REVIEW", "PENDING_DEVELOPER_RELEASE", "PENDING_APPLE_RELEASE"].includes(s);
  });
  if (!inReview) {
    console.log("No submitted version found. Recent versions:");
    for (const v of r.data) {
      console.log(`  ${v.attributes.versionString}  ${v.attributes.appVersionState || v.attributes.appStoreState}`);
    }
    return;
  }
  const versionId = inReview.id;
  const versionStr = inReview.attributes.versionString;
  const state = inReview.attributes.appVersionState || inReview.attributes.appStoreState;
  console.log(`Version ${versionStr} (${state}) — id ${versionId}`);

  // Look up the submission record attached to this version.
  const sub = await api("GET", `appStoreVersions/${versionId}/relationships/appStoreVersionSubmission`);
  const submissionId = sub.data?.id;
  if (!submissionId) {
    console.log("No active submission found on this version — already editable.");
    return;
  }
  console.log(`Submission id: ${submissionId}`);

  await api("DELETE", `appStoreVersionSubmissions/${submissionId}`);
  console.log(`✓ Submission deleted. Version moved out of review queue.`);

  // Confirm the new state.
  const after = await api(
    "GET",
    `appStoreVersions/${versionId}?fields[appStoreVersions]=versionString,appVersionState,appStoreState`,
  );
  const newState = after.data.attributes.appVersionState || after.data.attributes.appStoreState;
  console.log(`Now: ${after.data.attributes.versionString} → ${newState}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
