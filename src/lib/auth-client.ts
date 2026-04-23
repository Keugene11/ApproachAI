import { signIn } from "next-auth/react";
import { isNativePlatform, isNativeAndroid } from "./platform";
import { initSocialLogin } from "./capacitor";

type Result = { error: null } | { error: string };

async function nativeSignIn(provider: "apple" | "google"): Promise<Result> {
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

    window.location.href = "/";
    return { error: null };
  } catch (e: unknown) {
    const error = e as { code?: string; message?: string };
    if (error.message?.includes("cancel") || error.code === "SIGN_IN_CANCELLED") {
      return { error: null };
    }
    return { error: error.message || error.code || JSON.stringify(e) };
  }
}

export async function signInWithGoogle(): Promise<Result> {
  if (isNativePlatform()) return nativeSignIn("google");
  await signIn("google", { redirectTo: "/" });
  return { error: null };
}

export async function signInWithApple(): Promise<Result> {
  if (isNativePlatform()) return nativeSignIn("apple");
  await signIn("apple", { redirectTo: "/" });
  return { error: null };
}
