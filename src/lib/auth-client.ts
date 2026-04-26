import { signIn } from "next-auth/react";
import { isNativePlatform, isNativeAndroid } from "./platform";
import { initSocialLogin } from "./capacitor";

type Result = { error: null } | { error: string };

async function nativeSignIn(provider: "apple" | "google", redirectTo: string = "/"): Promise<Result> {
  try {
    await initSocialLogin();
    const { SocialLogin } = await import("@capgo/capacitor-social-login");

    let res;
    if (provider === "apple") {
      res = await SocialLogin.login({ provider: "apple", options: { scopes: ["name", "email"] } });
    } else if (isNativeAndroid()) {
      // Bottom-sheet Credential Manager path (GetGoogleIdOption). The default
      // path (GetSignInWithGoogleOption) renders a centered modal dialog and
      // also hits a [16] reauth bug on freshly-created OAuth clients. Clear
      // any stale credential state first to avoid that same bug.
      try { await SocialLogin.logout({ provider: "google" }); } catch {}
      res = await SocialLogin.login({
        provider: "google",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options: { style: "bottom", forcePrompt: false, filterByAuthorizedAccounts: false, autoSelectEnabled: false } as any,
      });
    } else {
      res = await SocialLogin.login({ provider: "google", options: { forcePrompt: true } });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = res?.result as any;
    const idToken: string | null = result?.idToken ?? null;

    if (!idToken) return { error: "Native sign-in returned no idToken" };

    const tokenRes = await fetch("/api/auth/native/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, idToken }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      return { error: `Token verification failed: ${tokenRes.status} ${body}` };
    }

    window.location.href = redirectTo;
    return { error: null };
  } catch (e: unknown) {
    const error = e as { code?: string | number; message?: string };
    if (isUserCancellation(error)) return { error: null };
    return { error: error.message || String(error.code) || JSON.stringify(e) };
  }
}

// Cancel signals across providers and platforms:
//   - Google Android plugin → code "SIGN_IN_CANCELLED" or message contains "cancel"
//   - Apple iOS (ASAuthorizationError.canceled = 1001) → message looks like
//     "The operation couldn't be completed. (com.apple.AuthenticationServices.
//     AuthorizationError error 1001.)" — no "cancel" word, just code 1001
//   - Apple iOS unknown failure (1000) is also treated as a quiet bail; the
//     user typically saw a sheet that auto-dismissed
//   - Web SDK style → message includes "cancelled" / "user denied"
function isUserCancellation(e: { code?: string | number; message?: string }): boolean {
  const msg = (e.message || "").toLowerCase();
  if (msg.includes("cancel")) return true;
  if (msg.includes("user denied")) return true;
  if (msg.includes("error 1001")) return true;
  if (msg.includes("authorizationerror")) return true;
  const code = String(e.code ?? "").toLowerCase();
  if (code === "sign_in_cancelled") return true;
  if (code === "1001") return true;
  return false;
}

export async function signInWithGoogle(redirectTo: string = "/"): Promise<Result> {
  if (isNativePlatform()) return nativeSignIn("google", redirectTo);
  await signIn("google", { redirectTo });
  return { error: null };
}

export async function signInWithApple(redirectTo: string = "/"): Promise<Result> {
  if (isNativePlatform()) return nativeSignIn("apple", redirectTo);
  await signIn("apple", { redirectTo });
  return { error: null };
}

export async function signInAsReviewer(
  email: string,
  password: string,
  redirectTo: string = "/",
): Promise<Result> {
  try {
    const res = await signIn("reviewer", { email, password, redirect: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = res as any;
    if (r?.error) return { error: "Invalid reviewer credentials" };
    if (r?.ok === false) return { error: "Sign-in failed" };
    window.location.href = redirectTo;
    return { error: null };
  } catch (e: unknown) {
    const error = e as { message?: string };
    return { error: error.message || "Reviewer sign-in failed" };
  }
}
