import { NextResponse } from "next/server";

/**
 * Aggressive sign-out for native WebViews. NextAuth's default signOut sets
 * `Max-Age=0` on the session cookie, but on Capacitor Android the WebView
 * has been observed to restore the cookie from its on-disk store after an
 * app force-close/reopen cycle.
 *
 * This endpoint expires every session-adjacent cookie we've ever set with
 * both `Max-Age=0` AND an explicit past `Expires`, across the production
 * and non-production name variants, so the WebView has no reason to hang
 * onto any of them.
 */
const COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
];

function clearCookieHeaders(): string[] {
  return COOKIE_NAMES.flatMap((name) => {
    const secure = name.startsWith("__Secure-") || name.startsWith("__Host-");
    const base = `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    return [secure ? `${base}; Secure` : base];
  });
}

export async function POST() {
  const res = NextResponse.json({ ok: true });
  for (const header of clearCookieHeaders()) {
    res.headers.append("Set-Cookie", header);
  }
  return res;
}
