import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ApproachAI - Your Cold Approach Wingman",
  description: "AI-powered confidence coach for cold approaches. Get motivated, get a game plan, and go talk to her.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
