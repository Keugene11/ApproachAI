"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Check, CreditCard, X, Zap, Camera, MessageCircle, Flame, Trophy, Shield, Star, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

type Subscription = {
  status: string;
  price_id: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
} | null;

const FEATURES = [
  { name: "Daily check-ins & streaks", free: true, pro: true },
  { name: "Community access", free: true, pro: true },
  { name: "XP, badges & levels", free: true, pro: true },
  { name: "Weekly leagues", free: true, pro: true },
  { name: "AI coaching sessions", free: "3/day", pro: "Unlimited" },
  { name: "Photo scene analysis", free: false, pro: true },
  { name: "Personalized openers", free: false, pro: true },
  { name: "Situational approach plans", free: false, pro: true },
  { name: "Dating profile reviews", free: false, pro: true },
  { name: "Text convo coaching", free: false, pro: true },
];

const TESTIMONIALS = [
  {
    text: "I was terrified of talking to strangers. After 2 weeks of daily check-ins and using the coach before approaches, I got my first number.",
    name: "Marcus",
    detail: "14-day streak",
  },
  {
    text: "The photo analysis is insane. It told me exactly what to say based on what she was doing. I just followed the plan and it worked.",
    name: "Jake",
    detail: "22 approaches",
  },
  {
    text: "Worth every penny. It's like having a confident friend in your pocket who actually gives you good advice, not generic BS.",
    name: "Alex",
    detail: "Pro member",
  },
];

const FAQ = [
  {
    q: "Can I try it for free first?",
    a: "Yes — check-ins, streaks, badges, leagues, and community are completely free. You get 3 AI coaching sessions per day to try it out. Upgrade when you're ready for unlimited coaching and photo analysis.",
  },
  {
    q: "What makes this different from ChatGPT?",
    a: "Wingmate is purpose-built for approaching people. It analyzes your specific situation from photos, gives you openers tailored to the exact moment, and tracks your progress over time. Generic AI doesn't do that.",
  },
  {
    q: "Is my data private?",
    a: "Photos never leave your device. Chat sessions aren't stored after they end. We only keep your check-in history and stats. No one will ever know you use this app.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, cancel with one tap from your profile or the billing portal. No questions, no hoops. You keep access until the end of your billing period.",
  },
];

export default function PlansPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "monthly">("yearly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stripe/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.subscription) setSubscription(data.subscription);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const handleCheckout = async (plan: "monthly" | "yearly") => {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoadingPortal(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const isActive = subscription?.status === "active" || subscription?.status === "trialing";
  const isYearly = subscription?.price_id?.includes("yearly") || subscription?.price_id?.includes("year");

  if (!loaded) return null;

  // Active subscriber view
  if (isActive) {
    return (
      <main className="min-h-screen max-w-md mx-auto px-5 pt-6 pb-24 animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.back()} className="p-1 -ml-1 press">
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <h1 className="font-display text-[20px] font-bold tracking-tight">Your Plan</h1>
        </div>

        <div className="bg-[#1a1a1a] text-white rounded-2xl px-5 py-6 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={18} strokeWidth={2} className="text-yellow-400" />
            <span className="font-display text-[18px] font-bold">Wingmate Pro</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-[32px] font-bold leading-none">${isYearly ? "10" : "15"}</span>
            <span className="text-white/60 text-[14px]">/month</span>
          </div>
          {isYearly && <p className="text-white/50 text-[13px] mt-1">$120 billed annually</p>}
          <p className="text-white/60 text-[13px] mt-3">
            {subscription?.cancel_at_period_end
              ? `Cancels ${formatDate(subscription.current_period_end)}`
              : `Renews ${formatDate(subscription!.current_period_end)}`}
          </p>
        </div>

        <button
          onClick={handleManageBilling}
          disabled={loadingPortal}
          className="flex items-center gap-3.5 w-full bg-bg-card border border-border rounded-xl px-4 py-3.5 text-left press disabled:opacity-60"
        >
          <CreditCard size={18} strokeWidth={1.5} className="text-text-muted shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-[15px]">
              {loadingPortal ? "Redirecting..." : "Manage billing"}
            </p>
            <p className="text-text-muted text-[12px] mt-0.5">Change plan, update payment, cancel</p>
          </div>
        </button>

        <div className="mt-8">
          <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide mb-3">
            Your features
          </p>
          <div className="space-y-2.5">
            {FEATURES.filter(f => f.pro === true || typeof f.pro === "string").map((f) => (
              <div key={f.name} className="flex items-center gap-2.5">
                <Check size={15} strokeWidth={2.5} className="text-[#1a1a1a] shrink-0" />
                <span className="text-[14px]">
                  {f.name}
                  {typeof f.pro === "string" && <span className="text-text-muted ml-1">({f.pro})</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        <BottomNav />
      </main>
    );
  }

  // Non-subscriber: full sales page
  return (
    <main className="min-h-screen max-w-md mx-auto px-5 pt-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="p-1 -ml-1 press">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
      </div>

      {/* Hero */}
      <div className="text-center mb-10 animate-slide-up">
        <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
          <Zap size={28} strokeWidth={1.5} className="text-yellow-400" />
        </div>
        <h1 className="font-display text-[32px] font-extrabold tracking-tight leading-[1.1] mb-3">
          Stop hesitating.<br />Start approaching.
        </h1>
        <p className="text-text-muted text-[16px] leading-relaxed max-w-[320px] mx-auto">
          Wingmate Pro gives you unlimited AI coaching and photo analysis to master any social situation.
        </p>
      </div>

      {/* Plan Toggle */}
      <div className="bg-bg-card border border-border rounded-2xl p-1.5 flex gap-1 mb-4">
        <button
          onClick={() => setSelectedPlan("yearly")}
          className={`flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-colors relative ${
            selectedPlan === "yearly"
              ? "bg-[#1a1a1a] text-white"
              : "text-text-muted"
          }`}
        >
          Yearly
          {selectedPlan === "yearly" && (
            <span className="absolute -top-2.5 right-2 text-[10px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-full">
              -33%
            </span>
          )}
        </button>
        <button
          onClick={() => setSelectedPlan("monthly")}
          className={`flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-colors ${
            selectedPlan === "monthly"
              ? "bg-[#1a1a1a] text-white"
              : "text-text-muted"
          }`}
        >
          Monthly
        </button>
      </div>

      {/* Selected Plan Card */}
      <div className="bg-bg-card border-2 border-[#1a1a1a] rounded-2xl px-5 py-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-display text-[14px] font-semibold text-text-muted">Wingmate Pro</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-display text-[36px] font-extrabold leading-none">
                ${selectedPlan === "yearly" ? "10" : "15"}
              </span>
              <span className="text-text-muted text-[15px]">/month</span>
            </div>
            {selectedPlan === "yearly" && (
              <p className="text-text-muted text-[13px] mt-1">
                $120 billed annually
                <span className="ml-1.5 text-green-600 font-semibold">Save $60</span>
              </p>
            )}
            {selectedPlan === "monthly" && (
              <p className="text-text-muted text-[13px] mt-1">Cancel anytime, no commitment</p>
            )}
          </div>
        </div>

        <button
          onClick={() => handleCheckout(selectedPlan)}
          disabled={!!loading}
          className="w-full bg-[#1a1a1a] text-white py-3.5 rounded-xl font-semibold text-[15px] press disabled:opacity-60"
        >
          {loading ? "Redirecting..." : "Get Wingmate Pro"}
        </button>

        <p className="text-center text-[11px] text-text-muted mt-3">
          7-day money-back guarantee. Cancel anytime.
        </p>
      </div>

      {/* What's included — visual feature cards */}
      <div className="mb-10">
        <h2 className="font-display text-[20px] font-bold tracking-tight mb-5 text-center">
          Everything in Pro
        </h2>

        <div className="grid grid-cols-2 gap-2.5 mb-3 stagger">
          <div className="bg-bg-card border border-border rounded-xl px-4 py-4 text-center">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-2">
              <Camera size={18} strokeWidth={1.5} className="text-blue-500" />
            </div>
            <p className="font-semibold text-[13px] leading-tight">Photo analysis</p>
            <p className="text-text-muted text-[11px] mt-1">Analyze any situation from a photo</p>
          </div>

          <div className="bg-bg-card border border-border rounded-xl px-4 py-4 text-center">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-2">
              <MessageCircle size={18} strokeWidth={1.5} className="text-purple-500" />
            </div>
            <p className="font-semibold text-[13px] leading-tight">Unlimited coaching</p>
            <p className="text-text-muted text-[11px] mt-1">No daily limits on AI sessions</p>
          </div>

          <div className="bg-bg-card border border-border rounded-xl px-4 py-4 text-center">
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-2">
              <Flame size={18} strokeWidth={1.5} className="text-orange-500" />
            </div>
            <p className="font-semibold text-[13px] leading-tight">Custom openers</p>
            <p className="text-text-muted text-[11px] mt-1">Tailored lines for the exact moment</p>
          </div>

          <div className="bg-bg-card border border-border rounded-xl px-4 py-4 text-center">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-2">
              <Shield size={18} strokeWidth={1.5} className="text-green-500" />
            </div>
            <p className="font-semibold text-[13px] leading-tight">Text coaching</p>
            <p className="text-text-muted text-[11px] mt-1">What to text back, explained</p>
          </div>
        </div>
      </div>

      {/* Free vs Pro comparison */}
      <div className="mb-10">
        <h2 className="font-display text-[20px] font-bold tracking-tight mb-4 text-center">
          Free vs Pro
        </h2>

        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr,64px,64px] px-4 py-3 border-b border-border bg-bg-input/50">
            <span className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">Feature</span>
            <span className="text-[12px] font-semibold text-text-muted uppercase tracking-wide text-center">Free</span>
            <span className="text-[12px] font-semibold text-text-muted uppercase tracking-wide text-center">Pro</span>
          </div>

          {/* Table Body */}
          {FEATURES.map((f, i) => (
            <div
              key={f.name}
              className={`grid grid-cols-[1fr,64px,64px] px-4 py-2.5 items-center ${
                i < FEATURES.length - 1 ? "border-b border-border/50" : ""
              }`}
            >
              <span className="text-[13px]">{f.name}</span>
              <div className="flex justify-center">
                {f.free === true ? (
                  <Check size={15} strokeWidth={2.5} className="text-green-500" />
                ) : f.free === false ? (
                  <X size={15} strokeWidth={2} className="text-border" />
                ) : (
                  <span className="text-[11px] font-medium text-text-muted">{f.free}</span>
                )}
              </div>
              <div className="flex justify-center">
                {f.pro === true ? (
                  <Check size={15} strokeWidth={2.5} className="text-green-500" />
                ) : (
                  <span className="text-[11px] font-medium text-[#1a1a1a] font-semibold">{f.pro}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Social proof */}
      <div className="mb-10">
        <h2 className="font-display text-[20px] font-bold tracking-tight mb-4 text-center">
          Real results
        </h2>

        <div className="space-y-3 stagger">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-bg-card border border-border rounded-xl px-5 py-4">
              <div className="flex gap-0.5 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={13} strokeWidth={0} fill="#1a1a1a" />
                ))}
              </div>
              <p className="text-[14px] leading-relaxed mb-3">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[13px]">{t.name}</span>
                <span className="text-[11px] text-text-muted font-medium">{t.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The pitch */}
      <div className="bg-[#1a1a1a] text-white rounded-2xl px-5 py-6 mb-10 text-center">
        <p className="text-[15px] leading-relaxed mb-1">
          Think about the last time you saw someone and didn&apos;t approach.
        </p>
        <p className="text-white/60 text-[14px] leading-relaxed mb-4">
          That moment of regret is worth way more than $10/month. Wingmate makes sure it doesn&apos;t happen again.
        </p>
        <button
          onClick={() => handleCheckout(selectedPlan)}
          disabled={!!loading}
          className="w-full bg-white text-[#1a1a1a] py-3 rounded-xl font-semibold text-[14px] press disabled:opacity-60"
        >
          {loading ? "Redirecting..." : `Start for $${selectedPlan === "yearly" ? "10" : "15"}/mo`}
        </button>
      </div>

      {/* FAQ */}
      <div className="mb-10">
        <h2 className="font-display text-[20px] font-bold tracking-tight mb-4 text-center">
          Common questions
        </h2>

        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div key={i} className="bg-bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left press"
              >
                <span className="font-medium text-[14px] pr-4">{item.q}</span>
                <ChevronDown
                  size={16}
                  strokeWidth={2}
                  className={`text-text-muted shrink-0 transition-transform ${
                    openFaq === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-3.5 -mt-1">
                  <p className="text-text-muted text-[13px] leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div className="text-center mb-4">
        <button
          onClick={() => handleCheckout(selectedPlan)}
          disabled={!!loading}
          className="w-full bg-[#1a1a1a] text-white py-3.5 rounded-xl font-semibold text-[15px] press disabled:opacity-60 mb-3"
        >
          {loading ? "Redirecting..." : "Get Wingmate Pro"}
        </button>
        <p className="text-[11px] text-text-muted">
          Secure payment via Stripe. 7-day money-back guarantee. Cancel anytime.
        </p>
      </div>
    </main>
  );
}
