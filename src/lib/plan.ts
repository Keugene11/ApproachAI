// The Plan is the card the user opens when they see a girl and freeze.
// 5-second read. Punchy lines, not paragraphs.

export type PlanLocation = "city" | "suburb" | "town" | "rural";
export type PlanStatus = "student" | "working" | "other";
export type PlanBlocker = "rejection" | "words" | "confidence" | "time";

export type PlanProfile = {
  status: string | null;
  location: string | null;
  blocker: string | null;
  goal: string | null;
  weekly_approach_goal: number | null;
  plan_note: string | null;
};

export type PlanMotivation = {
  why: string;
  lie: string;
  truth: string;
  focus: string | null;
  weeklyTarget: number;
};

export type PlanState = {
  currentWeek: 1 | 2 | 3 | 4;
  daysIntoWeek: number;
  graduated: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function derivePlanState(createdAt: string | Date | null | undefined): PlanState {
  if (!createdAt) return { currentWeek: 1, daysIntoWeek: 0, graduated: false };
  const start = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  if (Number.isNaN(start)) return { currentWeek: 1, daysIntoWeek: 0, graduated: false };
  const daysSince = Math.max(0, Math.floor((Date.now() - start) / DAY_MS));
  const rawWeek = Math.floor(daysSince / 7) + 1;
  const currentWeek = Math.min(4, Math.max(1, rawWeek)) as 1 | 2 | 3 | 4;
  return {
    currentWeek,
    daysIntoWeek: daysSince % 7,
    graduated: rawWeek > 4,
  };
}

function whyFromGoal(goal: string | null): string {
  const goals = (goal || "").split(",").filter(Boolean);
  if (goals.includes("girlfriend")) return "You want a girlfriend. A real one.";
  if (goals.includes("hookups")) return "You want to live, not just scroll.";
  if (goals.includes("rizz")) return "You want to be the guy who can talk to anyone.";
  if (goals.includes("memories")) return "You want stories worth telling.";
  return "You want more than what you've got.";
}

function lieFromBlocker(blocker: string | null): string {
  switch (blocker) {
    case "rejection": return "\"She'll reject me.\"";
    case "words": return "\"I won't know what to say.\"";
    case "confidence": return "\"I'm not ready.\"";
    case "time": return "\"Not the right moment.\"";
    default: return "\"Not today.\"";
  }
}

function truthFromBlocker(blocker: string | null): string {
  switch (blocker) {
    case "rejection": return "Rejection is information. You still win by asking.";
    case "words": return "\"Hey\" has worked forever. Use any words.";
    case "confidence": return "You won't feel ready. Move first — feelings follow.";
    case "time": return "There is no right moment. 10 seconds or never.";
    default: return "Every 'not today' adds up to never.";
  }
}

export function buildMotivation(profile: PlanProfile): PlanMotivation {
  const raw = profile.weekly_approach_goal;
  return {
    why: whyFromGoal(profile.goal),
    lie: lieFromBlocker(profile.blocker),
    truth: truthFromBlocker(profile.blocker),
    focus: (profile.plan_note || "").trim() || null,
    weeklyTarget: typeof raw === "number" && raw > 0 ? raw : 5,
  };
}
