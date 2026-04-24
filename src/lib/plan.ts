// 4-week rizz plan. Content is static templates personalized at read time
// from the user's profile fields (status, location, blocker, goal).

export type PlanLocation = "city" | "suburb" | "town" | "rural";
export type PlanStatus = "student" | "working" | "other";
export type PlanBlocker = "rejection" | "words" | "confidence" | "time";

export type PlanProfile = {
  status: string | null;
  location: string | null;
  blocker: string | null;
  goal: string | null; // comma-separated ids, e.g. "girlfriend,rizz"
};

export type PlanWeek = {
  number: 1 | 2 | 3 | 4;
  theme: string;
  why: string;
  tasks: string[];
  endOfWeek: string;
};

export type PlanState = {
  currentWeek: 1 | 2 | 3 | 4;
  daysIntoWeek: number; // 0-6
  graduated: boolean; // true once the user is past the 4-week curriculum
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function derivePlanState(createdAt: string | Date | null | undefined): PlanState {
  if (!createdAt) {
    return { currentWeek: 1, daysIntoWeek: 0, graduated: false };
  }
  const start = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  if (Number.isNaN(start)) {
    return { currentWeek: 1, daysIntoWeek: 0, graduated: false };
  }
  const daysSince = Math.max(0, Math.floor((Date.now() - start) / DAY_MS));
  const rawWeek = Math.floor(daysSince / 7) + 1;
  const currentWeek = Math.min(4, Math.max(1, rawWeek)) as 1 | 2 | 3 | 4;
  return {
    currentWeek,
    daysIntoWeek: daysSince % 7,
    graduated: rawWeek > 4,
  };
}

function hotspotFor(location: string | null): string {
  switch (location) {
    case "city": return "coffee shops and busy streets";
    case "suburb": return "the mall, grocery stores, and gyms";
    case "town": return "your regular spots — the café, the gym, the bookstore";
    case "rural": return "the few spots you do go to — make every trip count";
    default: return "your daily spots";
  }
}

function blockerFraming(blocker: string | null): string {
  switch (blocker) {
    case "rejection": return "Every attempt counts as a win, even if she ignores you. You showed up.";
    case "words": return "Short is fine. You don't need a script — a two-word opener works.";
    case "confidence": return "You don't need to feel ready. Act first, confidence follows.";
    case "time": return "Don't wait for the 'right' moment. Do it in the first 10 seconds or you won't do it at all.";
    default: return "Just do the reps. The fear shrinks every time.";
  }
}

function goalLine(goal: string | null): string {
  const goals = (goal || "").split(",").filter(Boolean);
  if (goals.includes("girlfriend")) return "You're looking for quality — close the loop with the ones who actually spark something.";
  if (goals.includes("hookups")) return "Match her vibe. If she's giving energy, escalate the plan.";
  if (goals.includes("rizz")) return "This is the rep that builds the skill. Volume matters more than outcome.";
  return "Every closed loop is proof you can do this.";
}

function studentSpot(status: string | null, location: string | null): string {
  if (status === "student") return "campus library cafés, lecture halls, the student union";
  if (status === "working") return "the lunch spot near your office, after-work gyms, commuter coffee shops";
  return hotspotFor(location);
}

export function buildWeek(weekNum: 1 | 2 | 3 | 4, profile: PlanProfile): PlanWeek {
  const where = hotspotFor(profile.location);
  const spots = studentSpot(profile.status, profile.location);
  const framing = blockerFraming(profile.blocker);

  if (weekNum === 1) {
    return {
      number: 1,
      theme: "Eye Contact",
      why: "You don't need words yet. You need to stop avoiding eyes. A guy who can look at people without flinching is already halfway there.",
      tasks: [
        `Hold eye contact with 3 strangers a day for 2+ seconds`,
        `Smile at 1 person when they catch you looking — don't look away first`,
        `One walk a day through ${where} with your phone in your pocket`,
      ],
      endOfWeek: "Make eye contact and smile with someone who looks back.",
    };
  }

  if (weekNum === 2) {
    return {
      number: 2,
      theme: "Openers",
      why: `Say words to a stranger. You don't need a conversation — you need to prove your voice works. ${framing}`,
      tasks: [
        `2 openers a day — "hey, how's it going" or a comment on something in front of you`,
        `You're allowed to leave right after. No pressure to continue`,
        `Do most of them at ${spots}`,
      ],
      endOfWeek: "One opener accidentally becomes a 30-second back-and-forth.",
    };
  }

  if (weekNum === 3) {
    return {
      number: 3,
      theme: "Short Conversations",
      why: "Carry a 60-90 second chat without panicking. Ask one follow-up, share one thing about yourself, exit cleanly.",
      tasks: [
        `1-2 real mini-convos a day`,
        `Practice the exit — "Anyway, I gotta run, but it was good talking"`,
        `Listen to what she says back. Don't just plan your next line`,
      ],
      endOfWeek: "A 2-minute conversation that doesn't feel forced.",
    };
  }

  // Week 4
  return {
    number: 4,
    theme: "Getting Numbers",
    why: `You're past the hard part. Stop walking away empty-handed. One line closes the loop. ${goalLine(profile.goal)}`,
    tasks: [
      `1 attempt a day at asking for Instagram or a number`,
      `Exact line: "Hey, I gotta go but you seem cool — what's your Instagram?"`,
      `If she says no, say "all good, have a great one" and walk. Practice the exit clean`,
    ],
    endOfWeek: "One IG or number this week. Ghosting doesn't matter — you closed.",
  };
}

export const WEEK_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Eye Contact",
  2: "Openers",
  3: "Short Convos",
  4: "Numbers",
};
