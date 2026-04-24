// The Plan is a motivational document the user opens in the moment —
// when they see a girl and the fear kicks in. It reminds them of their
// goals, reframes their blocker, and fires them up to go.

export type PlanLocation = "city" | "suburb" | "town" | "rural";
export type PlanStatus = "student" | "working" | "other";
export type PlanBlocker = "rejection" | "words" | "confidence" | "time";

export type PlanProfile = {
  status: string | null;
  location: string | null;
  blocker: string | null;
  goal: string | null; // comma-separated ids
  weekly_approach_goal: number | null;
  plan_note: string | null;
};

export type PlanMotivation = {
  why: { headline: string; body: string };
  fear: { lie: string; truth: string };
  math: string;
  focus: string | null;
  weeklyTarget: number;
};

function whyFromGoal(goal: string | null): { headline: string; body: string } {
  const goals = (goal || "").split(",").filter(Boolean);
  if (goals.includes("girlfriend")) {
    return {
      headline: "You want a girlfriend.",
      body: "A real connection. Someone who actually knows you. It starts with walking over.",
    };
  }
  if (goals.includes("hookups")) {
    return {
      headline: "You want to meet more girls.",
      body: "Not the scroll. Not the screen. Real nights, real stories. That starts right now.",
    };
  }
  if (goals.includes("rizz")) {
    return {
      headline: "You want to be the guy who can talk to anyone.",
      body: "That guy was built by reps. Every conversation, even the rough ones, gets you there.",
    };
  }
  if (goals.includes("memories")) {
    return {
      headline: "You want memories, not regrets.",
      body: "The stories worth telling come from the moments you said yes. Not the ones you dodged.",
    };
  }
  return {
    headline: "You're here because you want more.",
    body: "More life. More conversations. More yes. That's enough reason to go.",
  };
}

function fearFromBlocker(blocker: string | null): { lie: string; truth: string } {
  switch (blocker) {
    case "rejection":
      return {
        lie: "\"She'll reject me.\"",
        truth:
          "Rejection is information, not failure. She doesn't know you yet. You still win by going. No one loses respect for a guy who tried.",
      };
    case "words":
      return {
        lie: "\"I won't know what to say.\"",
        truth:
          "You don't need a script. \"Hey, how's it going\" has worked for every guy alive. Your voice works. Just use the words in your mouth.",
      };
    case "confidence":
      return {
        lie: "\"I need to feel ready first.\"",
        truth:
          "You won't feel ready. Confident guys aren't born confident — they moved first and the feeling followed. Act. The rest catches up.",
      };
    case "time":
      return {
        lie: "\"The moment isn't right.\"",
        truth:
          "There is no right moment. The window closes the longer you stand there. Ten seconds of courage or it doesn't happen.",
      };
    default:
      return {
        lie: "\"Not today.\"",
        truth:
          "Today is the only day you actually have. Every 'not today' adds up to never. Go now — future you will thank you.",
      };
  }
}

export function buildMotivation(profile: PlanProfile): PlanMotivation {
  return {
    why: whyFromGoal(profile.goal),
    fear: fearFromBlocker(profile.blocker),
    math:
      "Walk over: best case is everything. Worst case is 30 awkward seconds you'll both forget by tomorrow.\nDon't: 100% regret tonight. You already know the feeling.",
    focus: (profile.plan_note || "").trim() || null,
    weeklyTarget:
      typeof profile.weekly_approach_goal === "number" && profile.weekly_approach_goal > 0
        ? profile.weekly_approach_goal
        : 5,
  };
}
