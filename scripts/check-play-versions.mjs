import fs from "node:fs";
import crypto from "node:crypto";

const keyPath = process.env.GOOGLE_PLAY_KEY
  || `${process.env.USERPROFILE || process.env.HOME}/Downloads/voicenote-pro-484818-6d6db67c7fdb.json`;
const packageName = process.env.ANDROID_PACKAGE_ID || "com.approachai.twa";

const key = JSON.parse(fs.readFileSync(keyPath, "utf8"));

function base64url(input) {
  return Buffer.from(input).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function signJwt(claims, privateKey) {
  const header = { alg: "RS256", typ: "JWT" };
  const head = base64url(JSON.stringify(header));
  const body = base64url(JSON.stringify(claims));
  const toSign = `${head}.${body}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(toSign), privateKey);
  return `${toSign}.${base64url(signature)}`;
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const jwt = signJwt(claims, key.private_key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function main() {
  const token = await getAccessToken();
  const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}`;

  const editRes = await fetch(`${base}/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "{}",
  });
  const edit = await editRes.json();
  if (!edit.id) {
    console.error("Failed to create edit:", edit);
    process.exit(1);
  }

  for (const track of ["production", "alpha", "beta", "internal"]) {
    const r = await fetch(`${base}/edits/${edit.id}/tracks/${track}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await r.json();
    console.log(`\n=== ${track} ===`);
    if (data.releases) {
      for (const rel of data.releases) {
        console.log(`  status=${rel.status} versionCodes=[${(rel.versionCodes || []).join(", ")}] name=${rel.name || "(no name)"}`);
      }
    } else {
      console.log(" ", JSON.stringify(data));
    }
  }

  await fetch(`${base}/edits/${edit.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
