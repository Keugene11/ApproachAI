import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export async function GET() {
  try {
    const admin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: subs } = await admin
      .from("subscriptions")
      .select("price_id")
      .in("status", ["active", "trialing"]);

    let monthly = 0;
    let yearly = 0;

    for (const sub of subs || []) {
      const pid = sub.price_id || "";
      if (pid.includes("year")) yearly++;
      else monthly++;
    }

    return NextResponse.json({ monthly, yearly });
  } catch {
    return NextResponse.json({ monthly: 0, yearly: 0 });
  }
}
