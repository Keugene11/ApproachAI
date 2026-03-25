/**
 * Detect if running inside Capacitor iOS native app.
 * The Capacitor bridge injects window.Capacitor when loaded in the native shell.
 */

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      getPlatform: () => string;
    };
  }
}

export function isNativeiOS(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.Capacitor?.isNativePlatform() &&
    window.Capacitor?.getPlatform() === "ios"
  );
}

export function isNativeAndroid(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.Capacitor?.isNativePlatform() &&
    window.Capacitor?.getPlatform() === "android"
  );
}

export function isNativePlatform(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.Capacitor?.isNativePlatform()
  );
}
