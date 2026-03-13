import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  console.log("[auth/callback] code:", code ? "present" : "missing", "next:", next);
  console.log("[auth/callback] cookies:", request.cookies.getAll().map(c => c.name).join(", "));

  const redirectUrl = new URL(next, request.url);

  if (code) {
    const response = NextResponse.redirect(redirectUrl);
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    console.log("[auth/callback] exchange result:", error ? `ERROR: ${error.message}` : "SUCCESS");

    if (!error) {
      return response;
    }

    // Exchange failed — redirect home with error visible
    const errorUrl = new URL("/", request.url);
    errorUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(redirectUrl);
}
