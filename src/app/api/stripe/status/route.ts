import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  // TODO: temp override for demo — always return subscribed
  return NextResponse.json({ subscribed: true, subscription: null });
}
