"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

/**
 * Auth callback page for the implicit OAuth flow.
 * Supabase redirects here with tokens in the URL hash fragment.
 * The Supabase client picks them up automatically, then we redirect home.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        router.replace("/");
      }
    });
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
    </main>
  );
}
