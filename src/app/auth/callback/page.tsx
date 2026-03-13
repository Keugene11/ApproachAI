"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";

/**
 * Auth callback page for the implicit OAuth flow.
 * Supabase redirects here with tokens in the URL hash fragment (#access_token=...).
 * The Supabase client detects and processes them automatically.
 * We wait for a SIGNED_IN event, then navigate home.
 */
export default function AuthCallbackPage() {
  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        // Only redirect once the session is actually established from the hash tokens
        if (event === "SIGNED_IN") {
          subscription.unsubscribe();
          // Use window.location to ensure a full page load with the new session
          window.location.href = "/";
        }
      }
    );

    // Fallback: if no SIGNED_IN event within 8s (e.g. no hash tokens),
    // redirect home anyway — getUser() on the home page will handle it
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      window.location.href = "/";
    }, 8000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
    </main>
  );
}
