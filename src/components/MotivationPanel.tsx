"use client";

import { useState, useEffect } from "react";
import { Flame, Target, MessageCircle, ArrowRight, RefreshCw, Zap, Heart, Shield } from "lucide-react";

interface MotivationPanelProps {
  onStartChat: () => void;
  onReset: () => void;
  hasImage: boolean;
}

const motivationalQuotes = [
  { text: "Every legend was once a beginner who refused to quit.", icon: Flame },
  { text: "She's not out of your league. There are no leagues. Just people.", icon: Heart },
  { text: "Rejection is redirection. The worst she can say is no — and you'll survive.", icon: Shield },
  { text: "You miss 100% of the shots you don't take.", icon: Target },
  { text: "Confidence isn't knowing she'll say yes. It's knowing you'll be fine either way.", icon: Zap },
  { text: "The version of you that approaches her is the version you've been building toward.", icon: Flame },
  { text: "5 seconds of courage. That's all it takes to change everything.", icon: Target },
  { text: "She's probably hoping someone interesting talks to her today. Be that person.", icon: Heart },
];

const gamePlanSteps = [
  { step: "1", title: "Make Eye Contact", desc: "Catch her eye, smile naturally. If she smiles back or looks away and back — that's your green light." },
  { step: "2", title: "Walk Over Confidently", desc: "Shoulders back, head up, relaxed pace. No rushing. You're not nervous — you're interested." },
  { step: "3", title: "Open Simple & Direct", desc: "\"Hey, I noticed you from over there and I'd kick myself if I didn't come say hi. I'm [name].\"" },
  { step: "4", title: "Be Genuinely Curious", desc: "Ask about what she's doing, what she's into. Listen more than you talk. People love feeling heard." },
  { step: "5", title: "Read the Vibe", desc: "If she's engaged and smiling, keep going. If she's short or closed off, be gracious: \"It was great meeting you.\"" },
  { step: "6", title: "Close Naturally", desc: "\"I gotta get back to my friends, but I'd love to grab coffee sometime — can I get your number?\"" },
];

export default function MotivationPanel({ onStartChat, onReset, hasImage }: MotivationPanelProps) {
  const [activeTab, setActiveTab] = useState<"motivation" | "gameplan">("motivation");
  const [currentQuote, setCurrentQuote] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const nextQuote = () => {
    setCurrentQuote((prev) => (prev + 1) % motivationalQuotes.length);
  };

  const QuoteIcon = motivationalQuotes[currentQuote].icon;

  return (
    <div className={`w-full max-w-lg mx-auto transition-all duration-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("motivation")}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
            activeTab === "motivation"
              ? "bg-primary text-white"
              : "bg-bg-card text-text-muted hover:bg-bg-card-hover border border-border"
          }`}
        >
          <Flame size={18} />
          Motivation
        </button>
        <button
          onClick={() => setActiveTab("gameplan")}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
            activeTab === "gameplan"
              ? "bg-primary text-white"
              : "bg-bg-card text-text-muted hover:bg-bg-card-hover border border-border"
          }`}
        >
          <Target size={18} />
          Game Plan
        </button>
      </div>

      {activeTab === "motivation" ? (
        <div className="space-y-4">
          {/* Quote Card */}
          <div className="bg-bg-card border border-border rounded-2xl p-6 text-center">
            <QuoteIcon size={40} className="mx-auto mb-4 text-accent" />
            <p className="text-xl font-bold leading-relaxed mb-4">
              &ldquo;{motivationalQuotes[currentQuote].text}&rdquo;
            </p>
            <button
              onClick={nextQuote}
              className="text-primary hover:text-primary-dark transition flex items-center gap-2 mx-auto font-medium"
            >
              <RefreshCw size={16} />
              Next Quote
            </button>
          </div>

          {/* Reality Check */}
          <div className="bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 rounded-2xl p-5">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <Zap size={20} className="text-accent" />
              Real Talk
            </h3>
            <p className="text-text-muted leading-relaxed">
              Right now, you&apos;re already thinking about it — which means you want this.
              The anxiety you feel? That&apos;s excitement wearing a mask. Every successful person
              you admire has felt exactly what you&apos;re feeling right now. The difference?
              They walked over anyway.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-primary">93%</p>
              <p className="text-xs text-text-muted mt-1">of people are flattered by a genuine approach</p>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-accent">5 sec</p>
              <p className="text-xs text-text-muted mt-1">of courage is all you need</p>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-400">0</p>
              <p className="text-xs text-text-muted mt-1">people ever died from saying hi</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {gamePlanSteps.map((step) => (
            <div
              key={step.step}
              className="bg-bg-card border border-border rounded-xl p-4 flex gap-4 items-start"
            >
              <div className="bg-primary/20 text-primary font-bold rounded-lg w-10 h-10 flex items-center justify-center shrink-0 text-lg">
                {step.step}
              </div>
              <div>
                <h4 className="font-semibold mb-1">{step.title}</h4>
                <p className="text-sm text-text-muted leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={onStartChat}
          className="flex-1 bg-primary hover:bg-primary-dark text-white py-4 px-6 rounded-2xl transition font-semibold flex items-center justify-center gap-2 text-lg"
        >
          <MessageCircle size={22} />
          Talk to AI Coach
          <ArrowRight size={18} />
        </button>
        <button
          onClick={onReset}
          className="bg-bg-card hover:bg-bg-card-hover text-white p-4 rounded-2xl border border-border transition"
          title={hasImage ? "New Photo" : "Start Over"}
        >
          <RefreshCw size={22} />
        </button>
      </div>
    </div>
  );
}
