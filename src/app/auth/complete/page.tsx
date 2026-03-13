"use client";

import { useEffect } from "react";

export default function AuthComplete() {
  useEffect(() => {
    // Clean up and signal the PWA window that auth finished
    localStorage.removeItem("auth-pending-popup");
    localStorage.setItem("auth-complete", Date.now().toString());
    window.close();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">
      <p className="text-lg">Sign-in complete. You can close this tab.</p>
    </div>
  );
}
