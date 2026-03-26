import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ADJECTIVES = [
  "Bold","Brave","Chill","Cool","Daring","Epic","Fierce","Grand",
  "Happy","Keen","Lucky","Mighty","Noble","Quick","Sharp","Slick",
  "Smart","Smooth","Solid","Steady","Swift","Calm","Bright","Witty",
  "Clutch","Prime","Based","Alpha","Crisp","Fresh","Hype","Lit",
  "Ace","Chief","Raw","Real","Zen","True","Peak","Woke",
];
const ANIMALS = [
  "Falcon","Tiger","Wolf","Eagle","Hawk","Lion","Bear","Fox",
  "Shark","Panther","Cobra","Raven","Jaguar","Phoenix","Viper","Otter",
  "Lynx","Puma","Stallion","Mantis","Raptor","Bison","Crane","Drake",
  "Hound","Marlin","Osprey","Rhino","Condor","Gecko","Moose","Oryx",
];

function generateUsername(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${animal}${num}`;
}

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

// GET — fetch profile
export async function GET() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // If no profile yet, create one
  if (!profile) {
    const meta = user.user_metadata;
    const username = generateUsername();
    const { data: newProfile } = await supabase
      .from("profiles")
      .upsert({ id: user.id, username, avatar_url: meta?.avatar_url || meta?.picture || null })
      .select()
      .single();
    return NextResponse.json({ profile: newProfile });
  }

  return NextResponse.json({ profile });
}

// PATCH — update profile
export async function PATCH(req: Request) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, string> = { updated_at: new Date().toISOString() };

  if (body.username !== undefined) {
    const username = body.username.trim().slice(0, 30);
    if (username.length < 1) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }
    updates.username = username;
  }

  if (body.avatar_url !== undefined) {
    try {
      const parsed = new URL(body.avatar_url);
      if (!parsed.protocol.startsWith("http")) {
        return NextResponse.json({ error: "Invalid avatar URL" }, { status: 400 });
      }
      updates.avatar_url = body.avatar_url;
    } catch {
      return NextResponse.json({ error: "Invalid avatar URL" }, { status: 400 });
    }
  }

  if (body.goal !== undefined) {
    updates.goal = body.goal;
  }

  if (body.custom_goal !== undefined) {
    updates.custom_goal = body.custom_goal.trim().slice(0, 100);
  }

  if (body.weekly_approach_goal !== undefined) {
    const goal = Math.min(999, Math.max(0, Math.round(Number(body.weekly_approach_goal) || 0)));
    (updates as Record<string, unknown>).weekly_approach_goal = goal;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
