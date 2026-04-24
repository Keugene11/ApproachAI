"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Sparkles, ArrowUp } from "lucide-react";
import { buildMotivation, type PlanProfile } from "@/lib/plan";

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

function stripUpdates(content: string): string {
  return content.replace(/^\s*UPDATE\s+\w+\s*=.*$/gim, "").trim();
}

const OPENING_MESSAGE: Message = {
  role: "assistant",
  content:
    "What do you want to change? Your goal, your weekly target, what's holding you back, or your focus line for this week — just tell me.",
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
      plan_note: profile?.plan_note ?? null,
    }),
    [profile]
  );

  const motivation = useMemo(() => buildMotivation(profileData), [profileData]);

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

  const hasChatted = messages.some((m) => m.role === "user");

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted mb-1">
          When your heart's pounding — read this
        </p>
        <h1 className="font-display text-[30px] font-extrabold tracking-tight leading-[1.05]">
          Your Plan
        </h1>
      </div>

      {/* One big dark motivational card — read top-to-bottom in 15 seconds,
          put the phone down, go. */}
      <div
        className={`bg-[#1a1a1a] text-white rounded-3xl p-6 mb-5 shadow-xl transition-all ${
          justUpdated ? "ring-4 ring-green-400" : ""
        }`}
      >
        {/* Your why */}
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">
          Why you're doing this
        </p>
        <h2 className="font-display text-[24px] font-extrabold leading-[1.1] mb-2">
          {motivation.why.headline}
        </h2>
        <p className="text-[14.5px] leading-[1.55] text-white/85 mb-1">
          {motivation.why.body}
        </p>
        <p className="text-[11px] uppercase tracking-[0.15em] text-white/40 mt-3">
          Target · {motivation.weeklyTarget}/week
        </p>

        <div className="h-px bg-white/10 my-5" />

        {/* Your fear */}
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">
          The lie your brain tells you
        </p>
        <p className="font-display text-[17px] font-bold italic text-white/50 mb-3">
          {motivation.fear.lie}
        </p>
        <p className="text-[14.5px] leading-[1.6] text-white/90">
          {motivation.fear.truth}
        </p>

        <div className="h-px bg-white/10 my-5" />

        {/* The math */}
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">
          The math
        </p>
        {motivation.math.split("\n").map((line, i) => (
          <p
            key={i}
            className="text-[14.5px] leading-[1.6] text-white/90 mb-2 last:mb-0"
          >
            {line}
          </p>
        ))}

        {motivation.focus && (
          <>
            <div className="h-px bg-white/10 my-5" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300 mb-2">
              Your move right now
            </p>
            <p className="font-display text-[18px] font-semibold leading-snug">
              {motivation.focus}
            </p>
          </>
        )}

        <div className="h-px bg-white/10 my-5" />

        <p className="text-center font-display text-[20px] font-extrabold tracking-tight">
          Now put the phone down and go.
        </p>
      </div>

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
