import { NextResponse } from "next/server";

export async function GET() {
  const fingerprints = process.env.ANDROID_CERT_SHA256?.split(",") ?? [];

  const statements = fingerprints.map((fp) => ({
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: process.env.ANDROID_PACKAGE_ID ?? "com.approachai.twa",
      sha256_cert_fingerprints: [fp.trim()],
    },
  }));

  return NextResponse.json(statements, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
