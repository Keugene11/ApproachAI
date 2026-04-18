import { signIn } from "next-auth/react";
import { isNativePlatform, isNativeiOS, isNativeAndroid } from "./platform";
import { initSocialLogin, openInAppBrowser } from "./capacitor";

type Result = { error: null } | { error: string };

async function nativeSignIn(provider: "apple" | "google"): Promise<Result> {
  try {
    await initSocialLogin();
    const { SocialLogin } = await import("@capgo/capacitor-social-login");
    const res = provider === "google"
      ? await SocialLogin.login({ provider: "google", options: { forcePrompt: true } })
      : await SocialLogin.login({ provider: "apple", options: { scopes: ["name", "email"] } });

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
  if (isNativeiOS()) return nativeSignIn("google");
  if (isNativeAndroid()) {
    // Try Credential Manager first (one-tap from device account picker).
    // If it fails for any reason — flaky GCP propagation, stale grant, device
    // account state — silently fall back to Custom Tab + deep link OAuth.
    try {
      await initSocialLogin();
      const { SocialLogin } = await import("@capgo/capacitor-social-login");
      // Best-effort: clear any stale credential state from prior bad attempts.
      try { await SocialLogin.logout({ provider: "google" }); } catch {}
      const res = await SocialLogin.login({ provider: "google", options: { forcePrompt: false } });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const idToken = (res?.result as any)?.idToken as string | null;
      if (idToken) {
        const tokenRes = await fetch("/api/auth/native/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: "google", idToken }),
        });
        if (tokenRes.ok) {
          window.location.href = "/";
          return { error: null };
        }
      }
    } catch {
      // fall through to Custom Tab
    }
    await openInAppBrowser("/api/auth/native/google");
    return { error: null };
  }
  await signIn("google", { redirectTo: "/" });
  return { error: null };
}

export async function signInWithApple(): Promise<Result> {
  if (isNativePlatform()) return nativeSignIn("apple");
  await signIn("apple", { redirectTo: "/" });
  return { error: null };
}
