import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const first = new Date(dates[0] + "T00:00:00");
  const diffFirst = Math.floor((today.getTime() - first.getTime()) / 86400000);
  if (diffFirst > 1) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + "T00:00:00");
    const curr = new Date(dates[i] + "T00:00:00");
    const diff = Math.floor((prev.getTime() - curr.getTime()) / 86400000);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function computeBestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  // dates are sorted desc
  const sorted = [...dates].reverse(); // now asc
  let best = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00");
    const curr = new Date(sorted[i] + "T00:00:00");
    const diff = Math.floor((curr.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) {
      current++;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }
  return best;
}

// GET — fetch today's check-in status + streak + last 7 days + stats + history
export async function GET() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];

  // Get today's check-in
  const { data: todayCheckin } = await supabase
    .from("checkins")
    .select("*")
    .eq("user_id", user.id)
    .eq("checked_in_at", today)
    .single();

  // Get all check-ins for stats
  const { data: allCheckins } = await supabase
    .from("checkins")
    .select("checked_in_at, talked, note")
    .eq("user_id", user.id)
    .order("checked_in_at", { ascending: false });

  const checkins = allCheckins || [];
  const dates = checkins.map((c) => c.checked_in_at);
  const streak = computeStreak(dates);
  const bestStreak = computeBestStreak(dates);
  const totalCheckins = checkins.length;
  const totalTalked = checkins.filter((c) => c.talked).length;
  const approachRate = totalCheckins > 0 ? Math.round((totalTalked / totalCheckins) * 100) : 0;

  // Build last 7 days map
  const last7: { date: string; talked: boolean | null }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const checkin = checkins.find((c) => c.checked_in_at === dateStr);
    last7.push({
      date: dateStr,
      talked: checkin ? checkin.talked : null,
    });
  }

  // Recent history (last 14 entries with notes)
  const history = checkins.slice(0, 14).map((c) => ({
    date: c.checked_in_at,
    talked: c.talked,
    note: c.note,
  }));

  return NextResponse.json({
    checkedInToday: !!todayCheckin,
    talked: todayCheckin?.talked ?? null,
    note: todayCheckin?.note ?? null,
    streak,
    bestStreak,
    totalCheckins,
    totalTalked,
    approachRate,
    last7,
    history,
  });
}

// POST — record today's check-in
export async function POST(req: Request) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { talked, note } = await req.json();

  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabase.from("checkins").upsert(
    {
      user_id: user.id,
      talked,
      note: note || null,
      checked_in_at: today,
    },
    { onConflict: "user_id,checked_in_at" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Re-fetch stats
  const { data: allCheckins } = await supabase
    .from("checkins")
    .select("checked_in_at, talked")
    .eq("user_id", user.id)
    .order("checked_in_at", { ascending: false });

  const checkins = allCheckins || [];
  const dates = checkins.map((c) => c.checked_in_at);
  const streak = computeStreak(dates);
  const bestStreak = computeBestStreak(dates);
  const totalCheckins = checkins.length;
  const totalTalked = checkins.filter((c) => c.talked).length;
  const approachRate = totalCheckins > 0 ? Math.round((totalTalked / totalCheckins) * 100) : 0;

  return NextResponse.json({ success: true, streak, bestStreak, totalCheckins, totalTalked, approachRate });
}
