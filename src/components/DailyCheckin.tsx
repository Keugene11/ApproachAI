"use client";

import { useState, useEffect } from "react";
import { Flame, Check, X, MessageCircle, Trophy, TrendingUp, Calendar } from "lucide-react";

interface CheckinData {
  checkedInToday: boolean;
  talked: boolean | null;
  note: string | null;
  streak: number;
  bestStreak: number;
  totalCheckins: number;
  totalTalked: number;
  approachRate: number;
  last7: { date: string; talked: boolean | null }[];
  history: { date: string; talked: boolean; note: string | null }[];
}

const MILESTONES: Record<number, string> = {
  3: "3 days! You're building momentum.",
  7: "A whole week! You're on fire.",
  14: "Two weeks strong. This is who you are now.",
  21: "Three weeks. Most people quit by now. Not you.",
  30: "30 days. Absolute legend.",
  50: "50 days. You're unstoppable.",
  100: "100 DAYS. You've transformed.",
};

const MOTIVATION = [
  "Every conversation is a rep. You're getting stronger.",
  "Confidence isn't born — it's built. One day at a time.",
  "The hardest part is showing up. You're already here.",
  "Yesterday's courage is today's comfort zone.",
  "You miss 100% of the conversations you don't start.",
  "Small talk today, deep connection tomorrow.",
  "Fear shrinks every time you face it.",
  "The person you'll be in a month is watching. Make them proud.",
];

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function getMotivation(streak: number): string {
  if (streak === 0) return "Start your streak today. One conversation is all it takes.";
  if (streak === 1) return "Day one is done. Show up again tomorrow.";
  if (streak < 7) return MOTIVATION[Math.floor(Math.random() * MOTIVATION.length)];
  return "You're on a roll. Don't break the chain.";
}

function formatHistoryDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - date.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function DailyCheckin({ onTalkAboutIt }: { onTalkAboutIt: (talked: boolean) => void }) {
  const [data, setData] = useState<CheckinData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [showMilestone, setShowMilestone] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [showNoteField, setShowNoteField] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    fetch("/api/checkin")
      .then((res) => res.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const handleCheckin = async (talked: boolean) => {
    if (submitting) return;
    setSubmitting(true);

    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ talked }),
    });
    const result = await res.json();

    setData((prev) =>
      prev
        ? {
            ...prev,
            checkedInToday: true,
            talked,
            streak: result.streak,
            bestStreak: result.bestStreak,
            totalCheckins: result.totalCheckins,
            totalTalked: result.totalTalked,
            approachRate: result.approachRate,
            last7: prev.last7.map((d, i) =>
              i === prev.last7.length - 1 ? { ...d, talked } : d
            ),
          }
        : prev
    );
    setJustCheckedIn(true);
    setShowNoteField(true);
    setSubmitting(false);

    const milestone = MILESTONES[result.streak];
    if (milestone) {
      setShowMilestone(milestone);
      setTimeout(() => setShowMilestone(null), 5000);
    }
  };

  const saveNote = async () => {
    if (!noteInput.trim()) return;
    await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ talked: data?.talked, note: noteInput.trim() }),
    });
    setData((prev) => prev ? { ...prev, note: noteInput.trim() } : prev);
    setNoteSaved(true);
    setShowNoteField(false);
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="bg-bg-card border border-border rounded-2xl h-40 animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-bg-card border border-border rounded-xl h-20 animate-pulse" />
          <div className="bg-bg-card border border-border rounded-xl h-20 animate-pulse" />
          <div className="bg-bg-card border border-border rounded-xl h-20 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main check-in card */}
      <div className={`bg-bg-card border border-border rounded-2xl px-5 py-5 ${justCheckedIn ? "animate-fade-in" : ""}`}>
        {!data.checkedInToday ? (
          <>
            {/* Not checked in */}
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-3">
                <Flame size={28} strokeWidth={1.5} className="text-orange-500" />
              </div>
              <h2 className="font-display text-[18px] font-bold mb-1">Daily check-in</h2>
              <p className="text-text-muted text-[14px]">
                Did you talk to someone new today?
              </p>
            </div>

            <div className="flex gap-2 mb-5">
              <button
                onClick={() => handleCheckin(true)}
                disabled={submitting}
                className="flex-1 py-3.5 rounded-xl bg-[#1a1a1a] text-white text-[15px] font-medium press"
              >
                Yes, I did
              </button>
              <button
                onClick={() => handleCheckin(false)}
                disabled={submitting}
                className="flex-1 py-3.5 rounded-xl bg-bg-card-hover border border-border text-[15px] font-medium press"
              >
                Not yet
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Checked in — streak display */}
            <div className="text-center mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
                data.streak >= 7 ? "bg-orange-500" : data.streak >= 3 ? "bg-orange-400" : "bg-orange-100"
              } ${justCheckedIn ? "streak-pop" : ""}`}>
                <Flame size={32} strokeWidth={1.5} className={data.streak >= 3 ? "text-white" : "text-orange-500"} />
              </div>
              <p className="font-display text-[36px] font-extrabold leading-none mb-1">
                {data.streak}
              </p>
              <p className="text-text-muted text-[14px]">
                day{data.streak !== 1 ? "" : ""} streak
              </p>
            </div>

            {/* Milestone toast */}
            {showMilestone && (
              <div className="text-center text-[14px] font-medium text-orange-600 mb-3 animate-fade-in">
                {showMilestone}
              </div>
            )}
          </>
        )}

        {/* 7-day visualization */}
        <div className="flex justify-between px-1">
          {data.last7.map((day, i) => {
            const dayOfWeek = new Date(day.date + "T00:00:00").getDay();
            const isToday = i === data.last7.length - 1;
            return (
              <div key={day.date} className="flex flex-col items-center gap-1.5">
                <span className={`text-[10px] font-medium ${isToday ? "text-text" : "text-text-muted"}`}>
                  {DAY_LABELS[dayOfWeek]}
                </span>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    day.talked === true
                      ? "bg-green-500 text-white"
                      : day.talked === false
                      ? "bg-orange-100 text-orange-600"
                      : isToday
                      ? "border-2 border-dashed border-text-muted/30"
                      : "bg-bg-card-hover"
                  } ${justCheckedIn && isToday ? "streak-pop" : ""}`}
                >
                  {day.talked === true ? (
                    <Check size={14} strokeWidth={2.5} />
                  ) : day.talked === false ? (
                    <X size={14} strokeWidth={2.5} />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Note field after check-in */}
        {showNoteField && !noteSaved && (
          <div className="mt-4 animate-fade-in">
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value.slice(0, 280))}
              placeholder={data.talked ? "How did it go? What did you say?" : "What held you back today?"}
              rows={2}
              className="w-full bg-bg-card-hover border border-border rounded-xl px-4 py-3 text-[14px] leading-relaxed placeholder:text-text-muted/50 outline-none focus:border-text-muted transition-colors resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-text-muted">{noteInput.length}/280</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNoteField(false)}
                  className="text-[13px] text-text-muted press px-3 py-1.5"
                >
                  Skip
                </button>
                <button
                  onClick={saveNote}
                  disabled={!noteInput.trim()}
                  className={`text-[13px] font-medium press px-4 py-1.5 rounded-full transition-opacity ${
                    noteInput.trim() ? "bg-[#1a1a1a] text-white" : "bg-border text-text-muted opacity-50"
                  }`}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Talk about it CTA */}
        {data.checkedInToday && !showNoteField && (
          <button
            onClick={() => onTalkAboutIt(data.talked!)}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-bg-card-hover text-[14px] font-medium press"
          >
            <MessageCircle size={16} strokeWidth={1.5} />
            {data.talked ? "Tell me how it went" : "Let's talk about what's holding you back"}
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-card border border-border rounded-xl px-3 py-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Trophy size={13} strokeWidth={1.5} className="text-orange-500" />
            <span className="font-display text-[20px] font-bold">{data.bestStreak}</span>
          </div>
          <p className="text-[11px] text-text-muted">Best streak</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl px-3 py-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Calendar size={13} strokeWidth={1.5} className="text-text-muted" />
            <span className="font-display text-[20px] font-bold">{data.totalCheckins}</span>
          </div>
          <p className="text-[11px] text-text-muted">Total days</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl px-3 py-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp size={13} strokeWidth={1.5} className="text-green-500" />
            <span className="font-display text-[20px] font-bold">{data.approachRate}%</span>
          </div>
          <p className="text-[11px] text-text-muted">Approach rate</p>
        </div>
      </div>

      {/* Motivation */}
      <div className="bg-bg-card border border-border rounded-xl px-4 py-3">
        <p className="text-[14px] leading-relaxed text-center italic text-text-muted">
          &ldquo;{getMotivation(data.streak)}&rdquo;
        </p>
      </div>

      {/* History */}
      {data.history.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-text-muted uppercase tracking-wide mb-3 px-1">
            Recent activity
          </h3>
          <div className="space-y-2">
            {data.history.map((entry) => (
              <div
                key={entry.date}
                className="flex items-start gap-3 bg-bg-card border border-border rounded-xl px-4 py-3"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  entry.talked ? "bg-green-500 text-white" : "bg-orange-100 text-orange-600"
                }`}>
                  {entry.talked ? <Check size={13} strokeWidth={2.5} /> : <X size={13} strokeWidth={2.5} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[13px] font-medium">
                      {entry.talked ? "Talked to someone" : "Checked in"}
                    </span>
                    <span className="text-[12px] text-text-muted">{formatHistoryDate(entry.date)}</span>
                  </div>
                  {entry.note && (
                    <p className="text-[13px] text-text-muted leading-relaxed">{entry.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Streak info */}
      {data.streak > 0 && !data.checkedInToday && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-center">
          <p className="text-[14px] font-medium text-orange-700">
            You have a {data.streak}-day streak. Check in to keep it alive!
          </p>
        </div>
      )}
    </div>
  );
}
