"use client";

import { useEffect } from "react";
import { isNativePlatform } from "@/lib/platform";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Skip service worker in native Capacitor — WKWebView doesn't support it
    if (isNativePlatform()) return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  return null;
}
