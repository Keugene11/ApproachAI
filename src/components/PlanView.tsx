"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Sparkles, ArrowUp } from "lucide-react";
import { buildWeek, derivePlanState, type PlanProfile } from "@/lib/plan";

type ProfileResponse = {
  status: string | null;
  location: string | null;
  blocker: string | null;
  goal: string | null;
  weekly_approach_goal: number | null;
  plan_note: string | null;
  created_at: string | null;
};

type Message = { role: "user" | "assistant"; content: string };

type PlanUpdates = Partial<{
  weekly_approach_goal: number;
  blocker: string;
  location: string;
  status: string;
  plan_note: string;
}>;

// Parse the coach's "UPDATE <field>=<value>" directives out of an assistant
// message. Only whitelisted fields + values are accepted — anything else is
// silently ignored so a bad emission from Claude can't write garbage.
function parseUpdates(content: string): PlanUpdates {
  const updates: PlanUpdates = {};
  const regex = /^\s*UPDATE\s+(\w+)\s*=\s*(.+?)\s*$/gim;
  const matches = [...content.matchAll(regex)];
  for (const m of matches) {
    const field = m[1].trim();
    const raw = m[2].trim().replace(/^["']|["']$/g, "");
    if (field === "weekly_approach_goal") {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= 20) updates.weekly_approach_goal = n;
    } else if (field === "blocker" && ["rejection", "words", "confidence", "time"].includes(raw)) {
      updates.blocker = raw;
    } else if (field === "location" && ["city", "suburb", "town", "rural"].includes(raw)) {
      updates.location = raw;
    } else if (field === "status" && ["student", "working", "other"].includes(raw)) {
      updates.status = raw;
    } else if (field === "plan_note") {
      updates.plan_note = raw.slice(0, 500);
    }
  }
  return updates;
}

// Remove UPDATE directives from the rendered text so the user only sees the
// conversational part of the coach's reply.
function stripUpdates(content: string): string {
  return content.replace(/^\s*UPDATE\s+\w+\s*=.*$/gim, "").trim();
}

const OPENING_MESSAGE: Message = {
  role: "assistant",
  content:
    "What do you want to change about your plan? Tell me what's not clicking for you — the number, the spots, the blocker, or anything else going on.",
};

export default function PlanView() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState<Message[]>([OPENING_MESSAGE]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const justUpdatedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) setProfile(d.profile);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Scroll the conversation to the newest message.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => () => {
    if (justUpdatedTimer.current) clearTimeout(justUpdatedTimer.current);
  }, []);

  const profileData: PlanProfile = useMemo(
    () => ({
      status: profile?.status ?? null,
      location: profile?.location ?? null,
      blocker: profile?.blocker ?? null,
      goal: profile?.goal ?? null,
      weekly_approach_goal: profile?.weekly_approach_goal ?? null,
    }),
    [profile]
  );

  const state = useMemo(
    () => derivePlanState(profile?.created_at ?? null),
    [profile?.created_at]
  );

  const weeks = useMemo(
    () => [1, 2, 3, 4].map((n) => buildWeek(n as 1 | 2 | 3 | 4, profileData)),
    [profileData]
  );

  const applyUpdates = async (updates: PlanUpdates) => {
    if (Object.keys(updates).length === 0) return;
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setJustUpdated(true);
        if (justUpdatedTimer.current) clearTimeout(justUpdatedTimer.current);
        justUpdatedTimer.current = setTimeout(() => setJustUpdated(false), 2500);
      }
    } catch {}
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatLoading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setChatLoading(true);
    if (inputRef.current) inputRef.current.style.height = "auto";

    let assistantContent = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, mode: "plan" }),
      });

      if (!res.ok || !res.body) throw new Error("Chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              assistantContent += parsed.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Something went wrong — try that again in a second.",
        };
        return updated;
      });
      setChatLoading(false);
      return;
    }
    setChatLoading(false);

    // Apply any UPDATE directives the coach emitted in this reply.
    const updates = parseUpdates(assistantContent);
    if (Object.keys(updates).length > 0) applyUpdates(updates);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const week = weeks[state.currentWeek - 1];
  const focus = profile?.plan_note?.trim() || "";
  const hasChatted = messages.some((m) => m.role === "user");

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-5">
        <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.2] mb-1">
          Your Plan
        </h1>
        <p className="text-text-muted text-[14px]">
          {state.graduated
            ? "You've made it through the 4 weeks. Keep going."
            : `Week ${state.currentWeek} of 4 · day ${state.daysIntoWeek + 1}`}
        </p>
      </div>

      {/* Week timeline */}
      <div className="flex items-start gap-2 mb-5">
        {weeks.map((w) => {
          const isCurrent = w.number === state.currentWeek && !state.graduated;
          const isPast = w.number < state.currentWeek || (state.graduated && w.number <= 4);
          return (
            <div key={w.number} className="flex-1">
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
                  W{w.number}
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
                {w.heading}
              </p>
            </div>
          );
        })}
      </div>

      {/* Focus (if set) */}
      {focus && (
        <div
          className={`bg-[#1a1a1a] text-white rounded-2xl px-4 py-3.5 mb-3 transition-all ${
            justUpdated ? "ring-2 ring-green-400" : ""
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1">
            Your focus
          </p>
          <p className="text-[14px] leading-snug">{focus}</p>
        </div>
      )}

      {/* Current week — full card when idle, compact strip while chatting */}
      {hasChatted ? (
        <button
          type="button"
          onClick={() => setMessages([OPENING_MESSAGE])}
          className={`w-full flex items-center justify-between gap-3 bg-bg-card border rounded-xl shadow-card px-3.5 py-2.5 mb-3 press text-left transition-colors ${
            justUpdated ? "border-green-400" : "border-border"
          }`}
          title="Reset the conversation"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              W{week.number} · {week.heading} · {profile?.weekly_approach_goal || 5}/wk
            </p>
            <p className="text-[12px] leading-snug text-text/80 truncate">
              {week.endOfWeek}
            </p>
          </div>
          <span className="text-[10px] text-text-muted shrink-0">reset</span>
        </button>
      ) : (
        <div className="bg-bg-card border border-border rounded-2xl shadow-card p-4 mb-4">
          <h2 className="font-display text-[20px] font-bold leading-tight mb-1.5">
            {week.heading}
          </h2>
          <p className="text-text/75 text-[13.5px] leading-snug mb-4">{week.why}</p>

          <ul className="space-y-1.5 mb-4">
            {week.tasks.map((task, i) => (
              <li
                key={i}
                className="text-[13.5px] leading-snug text-text/90 flex gap-2"
              >
                <span className="text-text-muted shrink-0">·</span>
                <span>{task}</span>
              </li>
            ))}
          </ul>

          <div className="bg-bg-input rounded-lg px-3 py-2">
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-0.5">
              End of week
            </p>
            <p className="text-[13px] leading-snug font-medium">{week.endOfWeek}</p>
          </div>
        </div>
      )}

      {/* Chat */}
      <div className="bg-bg-card/50 border border-border/60 rounded-2xl p-3">
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-6 h-6 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0">
            <Sparkles size={12} strokeWidth={2.5} className="text-white" />
          </div>
          <p className="text-[12px] font-bold tracking-wide">Chat with Wingmate</p>
          <span className="text-[11px] text-text-muted ml-1">· change your plan</span>
          {justUpdated && (
            <span className="ml-auto text-[11px] font-semibold text-green-600 flex items-center gap-1">
              <Check size={11} strokeWidth={3} /> Plan updated
            </span>
          )}
        </div>

        <div className="space-y-2.5 mb-3">
          {messages.map((m, i) => {
            if (m.role === "user") {
              return (
                <div key={i} className="flex justify-end">
                  <div className="bg-[#1a1a1a] text-white rounded-2xl rounded-br-sm px-3.5 py-2.5 max-w-[85%] text-[14px] leading-[1.5]">
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              );
            }
            const display = stripUpdates(m.content);
            if (!display && !chatLoading) return null;
            return (
              <div key={i} className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={12} strokeWidth={2.5} className="text-white" />
                </div>
                <div className="bg-bg-card border border-border/60 rounded-2xl rounded-bl-sm px-3.5 py-2.5 max-w-[88%] text-[14px] leading-[1.5]">
                  <p className="whitespace-pre-wrap">{display}</p>
                </div>
              </div>
            );
          })}
          {chatLoading &&
            messages[messages.length - 1]?.role === "assistant" &&
            messages[messages.length - 1]?.content === "" && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={12} strokeWidth={2.5} className="text-white" />
                </div>
                <div className="bg-bg-card border border-border/60 rounded-2xl rounded-bl-sm px-3.5 py-3">
                  <div className="flex gap-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-orange-400/60 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-orange-400/60 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-orange-400/60 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 bg-bg border border-border rounded-2xl pl-4 pr-2 py-2"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder={hasChatted ? "Type your reply..." : "Type your reply here..."}
            rows={1}
            maxLength={2000}
            className="flex-1 bg-transparent text-text text-[15px] placeholder-text-muted/60 focus:outline-none resize-none leading-normal py-1 min-w-0"
            disabled={chatLoading}
          />
          <button
            type="submit"
            disabled={chatLoading || !input.trim()}
            className="bg-[#1a1a1a] disabled:opacity-15 text-white p-2.5 rounded-xl press shrink-0 transition-opacity"
          >
            <ArrowUp size={16} strokeWidth={2.5} />
          </button>
        </form>
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
