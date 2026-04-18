import { signIn } from "next-auth/react";
import { isNativePlatform, isNativeiOS, isNativeAndroid } from "./platform";
import { initSocialLogin } from "./capacitor";
import { LegacyGoogleAuth } from "./legacy-google-auth";

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
    return androidGoogleSignIn();
  }
  await signIn("google", { redirectTo: "/" });
  return { error: null };
}

async function androidGoogleSignIn(): Promise<Result> {
  // Use our custom Capacitor plugin that uses the legacy GoogleSignIn API
  // directly. Bypasses Credential Manager (which has the [16] reauth bug
  // for freshly-created OAuth clients).
  const webClientId = (process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID || "").trim();
  if (!webClientId) return { error: "NEXT_PUBLIC_AUTH_GOOGLE_ID is empty" };
  try {
    const res = await LegacyGoogleAuth.signIn({ webClientId });
    if (!res.idToken) return { error: "no idToken from legacy Google Auth" };
    const tokenRes = await fetch("/api/auth/native/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "google", idToken: res.idToken }),
    });
    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      return { error: `backend rejected token: ${tokenRes.status} ${body}` };
    }
    window.location.href = "/";
    return { error: null };
  } catch (e: unknown) {
    const err = e as { message?: string; code?: string };
    if (err.message?.includes("cancel") || err.message?.includes("12501") || err.code === "SIGN_IN_CANCELLED") {
      return { error: null };
    }
    return { error: `legacy: ${err.message || err.code || JSON.stringify(e)}` };
  }
}

export async function signInWithApple(): Promise<Result> {
  if (isNativePlatform()) return nativeSignIn("apple");
  await signIn("apple", { redirectTo: "/" });
  return { error: null };
}
