import { NextResponse } from "next/server";

/**
 * Returns the minimum required native app build number.
 * Bump this after pushing a TestFlight/Play Store build that
 * contains breaking native changes (new plugins, config, etc).
 */
const MIN_BUILD = "202603300321"; // Update this after each required native update

export async function GET() {
  return NextResponse.json({ minBuild: MIN_BUILD });
}
