import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

const FREE_SESSION_LIMIT = 3;

function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: Check how many free sessions remain
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check active subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single();

    if (subscription) {
      return NextResponse.json({ subscribed: true, sessionsUsed: 0, sessionsRemaining: -1, limit: FREE_SESSION_LIMIT });
    }

    const admin = getAdminClient();
    const { data: usage } = await admin
      .from("usage")
      .select("free_sessions_used")
      .eq("user_id", user.id)
      .single();

    const sessionsUsed = usage?.free_sessions_used ?? 0;

    return NextResponse.json({
      subscribed: false,
      sessionsUsed,
      sessionsRemaining: Math.max(0, FREE_SESSION_LIMIT - sessionsUsed),
      limit: FREE_SESSION_LIMIT,
    });
  } catch {
    return NextResponse.json({ error: "Failed to check usage" }, { status: 500 });
  }
}

// POST: Increment session count when a new chat session starts
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Don't count if subscribed
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single();

    if (subscription) {
      return NextResponse.json({ subscribed: true, sessionsUsed: 0 });
    }

    const admin = getAdminClient();

    const { data: usage } = await admin
      .from("usage")
      .select("free_sessions_used")
      .eq("user_id", user.id)
      .single();

    if (!usage) {
      // First session
      await admin.from("usage").insert({ user_id: user.id, free_sessions_used: 1 });
      return NextResponse.json({
        subscribed: false,
        sessionsUsed: 1,
        sessionsRemaining: FREE_SESSION_LIMIT - 1,
        limit: FREE_SESSION_LIMIT,
      });
    }

    if (usage.free_sessions_used >= FREE_SESSION_LIMIT) {
      return NextResponse.json({
        subscribed: false,
        sessionsUsed: usage.free_sessions_used,
        sessionsRemaining: 0,
        limit: FREE_SESSION_LIMIT,
        limitReached: true,
      });
    }

    const newCount = usage.free_sessions_used + 1;
    await admin
      .from("usage")
      .update({ free_sessions_used: newCount, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return NextResponse.json({
      subscribed: false,
      sessionsUsed: newCount,
      sessionsRemaining: Math.max(0, FREE_SESSION_LIMIT - newCount),
      limit: FREE_SESSION_LIMIT,
    });
  } catch (e) {
    console.error("Usage error:", e);
    return NextResponse.json({ error: "Failed to update usage" }, { status: 500 });
  }
}
