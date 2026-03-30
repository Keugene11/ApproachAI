import { isNativePlatform } from "./platform";
import { createClient } from "./supabase-browser";

/**
 * Hide the native splash screen once the web content is ready.
 * Safe to call on web — it's a no-op if not running in Capacitor.
 */
export async function hideSplash() {
  if (!isNativePlatform()) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 200 });
  } catch {}
}

/**
 * Listen for deep link auth callbacks from OAuth.
 * When the native app receives a wingmate:// URL with the auth code,
 * exchange it in the WKWebView (which has the PKCE code_verifier cookie).
 */
export async function setupAuthDeepLinkListener() {
  if (!isNativePlatform()) return;
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("appUrlOpen", async ({ url }) => {
      if (!url.includes("auth/callback")) return;
      const params = new URL(url);
      const code = params.searchParams.get("code");
      if (code) {
        const supabase = createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        // Close the in-app browser
        try {
          const { Browser } = await import("@capacitor/browser");
          await Browser.close();
        } catch {}
        if (!error) {
          window.location.href = "/";
        }
      }
    });
  } catch {}
}

/**
 * Check if the native app build is outdated and needs updating.
 * Returns true if an update is required.
 */
export async function checkForUpdate(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const { App } = await import("@capacitor/app");
    const info = await App.getInfo();
    const currentBuild = info.build; // e.g. "202603300258"
    const res = await fetch("/api/version");
    const { minBuild } = await res.json();
    if (minBuild && currentBuild < minBuild) return true;
  } catch {}
  return false;
}

/**
 * Open a URL in an in-app browser (SFSafariViewController on iOS).
 * Also listens for the browser to close, and if the user is now
 * authenticated (e.g. deep link set the session), reloads the page.
 * Falls back to window.open on web.
 */
export async function openInAppBrowser(url: string) {
  if (!isNativePlatform()) {
    window.location.href = url;
    return;
  }
  try {
    const { Browser } = await import("@capacitor/browser");
    // Listen for browser close to handle auth completion
    Browser.addListener("browserFinished", async () => {
      // Check if the deep link handler already set the session
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        window.location.href = "/";
      }
    });
    await Browser.open({ url, presentationStyle: "fullscreen" });
  } catch {
    window.location.href = url;
  }
}
