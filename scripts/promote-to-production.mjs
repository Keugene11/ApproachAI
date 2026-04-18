import { readFileSync } from "fs";
import { createSign } from "crypto";

const SA_PATH = process.argv[2] || "c:/Users/Daniel/Downloads/voicenote-pro-484818-6d6db67c7fdb.json";
const PACKAGE = process.argv[3] || "com.approachai.twa";

const sa = JSON.parse(readFileSync(SA_PATH, "utf8"));

function createJwt() {
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
  const signature = sign.sign(sa.private_key, "base64url");
  return `${header}.${payload}.${signature}`;
}

async function getToken() {
  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${createJwt()}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Auth failed: " + JSON.stringify(data));
  return data.access_token;
}

const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}`;

async function api(token, method, path, body) {
  const url = `${BASE}/${path}`;
  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(url, { method, headers, body: body || undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`API ${res.status} ${path}: ${text}`);
  return text ? JSON.parse(text) : {};
}

async function apiRaw(token, method, path, body) {
  const url = `${BASE}/${path}`;
  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(url, { method, headers, body: body || undefined });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { ok: res.ok, status: res.status, body: json };
}

async function main() {
  const token = await getToken();
  console.log("Authenticated.\n");

  const edit = await api(token, "POST", "edits", "{}");
  console.log(`Edit ID: ${edit.id}`);

  const alpha = await api(token, "GET", `edits/${edit.id}/tracks/alpha`);
  const latest = alpha.releases?.find(r => r.status === "completed")
    || alpha.releases?.[0];
  if (!latest) { console.log("No alpha releases."); process.exit(1); }
  const versionCodes = latest.versionCodes;
  console.log(`Alpha latest: versionCodes=${versionCodes} status=${latest.status}`);

  const desiredStatus = process.env.STATUS || "draft";
  const prodTrack = {
    track: "production",
    releases: [{
      name: latest.name || `${versionCodes[0]}`,
      versionCodes,
      status: desiredStatus,
      releaseNotes: [{ language: "en-US", text: "Bug fixes and improvements." }],
    }],
  };

  console.log(`\nSetting production track to ${desiredStatus}...`);
  const put = await apiRaw(token, "PUT", `edits/${edit.id}/tracks/production`, JSON.stringify(prodTrack));
  console.log("PUT response:", JSON.stringify(put, null, 2));
  if (!put.ok) { await apiRaw(token, "DELETE", `edits/${edit.id}`); process.exit(1); }

  console.log("\nValidating edit...");
  const val = await apiRaw(token, "POST", `edits/${edit.id}:validate`);
  console.log("Validate response:", JSON.stringify(val, null, 2));
  if (!val.ok) { await apiRaw(token, "DELETE", `edits/${edit.id}`); process.exit(1); }

  console.log("\nCommitting edit...");
  const commit = await apiRaw(token, "POST", `edits/${edit.id}:commit`);
  console.log("Commit response:", JSON.stringify(commit, null, 2));
  if (!commit.ok) process.exit(1);

  console.log(`\n=== Production track set to ${desiredStatus} with version ${versionCodes[0]} ===`);
  if (desiredStatus === "draft") {
    console.log("Go to Play Console → Production to finalize and roll out.");
  }
}

main().catch(e => { console.error(e); process.exit(1); });
