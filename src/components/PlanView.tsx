"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { buildWeek, derivePlanState, WEEK_LABELS, type PlanProfile } from "@/lib/plan";

type ProfileResponse = {
  status: string | null;
  location: string | null;
  blocker: string | null;
  goal: string | null;
  created_at: string | null;
};

export default function PlanView() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) setProfile(d.profile);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const profileData: PlanProfile = {
    status: profile?.status ?? null,
    location: profile?.location ?? null,
    blocker: profile?.blocker ?? null,
    goal: profile?.goal ?? null,
  };
  const state = derivePlanState(profile?.created_at ?? null);
  const week = buildWeek(state.currentWeek, profileData);
  const weekNums: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.2] mb-2">
          Your Plan
        </h1>
        <p className="text-text-muted text-[15px] leading-relaxed">
          {state.graduated
            ? "You've made it through the 4-week plan. Keep the reps going."
            : `Week ${state.currentWeek} of 4 — ${state.daysIntoWeek === 0 ? "just started" : `day ${state.daysIntoWeek + 1}`}`}
        </p>
      </div>

      {/* Week timeline */}
      <div className="flex items-center gap-2 mb-6">
        {weekNums.map((n) => {
          const isCurrent = n === state.currentWeek && !state.graduated;
          const isPast = n < state.currentWeek || (state.graduated && n <= 4);
          return (
            <div key={n} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${
                  isPast ? "bg-[#1a1a1a]" : isCurrent ? "bg-[#1a1a1a]" : "bg-border"
                }`}
              />
              <div className="flex items-center gap-1 mt-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isCurrent ? "text-text" : "text-text-muted/60"
                  }`}
                >
                  W{n}
                </span>
                {isPast && !isCurrent && (
                  <Check size={10} strokeWidth={3} className="text-[#1a1a1a]" />
                )}
              </div>
              <p
                className={`text-[11px] leading-tight mt-0.5 ${
                  isCurrent ? "text-text font-medium" : "text-text-muted/60"
                }`}
              >
                {WEEK_LABELS[n]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Current week card */}
      <div className="bg-bg-card border border-border rounded-2xl shadow-card p-5 mb-4">
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-1">
          This week
        </p>
        <h2 className="font-display text-[22px] font-bold leading-tight mb-3">
          {week.theme}
        </h2>
        <p className="text-text/80 text-[14.5px] leading-[1.6] mb-5">{week.why}</p>

        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-3">
          Your tasks
        </p>
        <div className="space-y-3 mb-5">
          {week.tasks.map((task, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-border shrink-0 mt-0.5" />
              <p className="text-[14.5px] leading-[1.55] text-text/90 flex-1">{task}</p>
            </div>
          ))}
        </div>

        <div className="bg-bg-input rounded-xl px-4 py-3">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-1">
            End of week
          </p>
          <p className="text-[14px] leading-snug font-medium">{week.endOfWeek}</p>
        </div>
      </div>

      {/* Footer note */}
      {!state.graduated && state.currentWeek < 4 && (
        <p className="text-center text-[12px] text-text-muted px-6 mt-4">
          Week {state.currentWeek + 1} unlocks in {7 - state.daysIntoWeek} {7 - state.daysIntoWeek === 1 ? "day" : "days"}.
        </p>
      )}
    </div>
  );
}
