import { NextRequest, NextResponse } from "next/server";

/**
 * Native OAuth callback — passes the auth code back to the app
 * via URL scheme so the WKWebView can exchange it (it has the
 * PKCE code_verifier cookie that SFSafariViewController doesn't).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return new NextResponse(
      '<html><body><p style="text-align:center;margin-top:40vh;font-family:system-ui">Authentication failed. Please close this window and try again.</p></body></html>',
      { headers: { "Content-Type": "text/html" } }
    );
  }

  // Pass the code (NOT tokens) back to the app via URL scheme.
  // The WKWebView will exchange it using its stored PKCE code_verifier.
  const html = `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body>
<p style="text-align:center;margin-top:40vh;font-family:system-ui;color:#999">Signing you in...</p>
<script>
  window.location.href = "wingmate://auth/callback?code=${encodeURIComponent(code)}";
  setTimeout(function() { window.location.href = "/"; }, 2000);
</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
