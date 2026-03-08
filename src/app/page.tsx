"use client";

import { useState } from "react";
import { Flame, Target, Zap } from "lucide-react";
import CameraCapture from "@/components/CameraCapture";
import ImageAnnotator from "@/components/ImageAnnotator";
import MotivationPanel from "@/components/MotivationPanel";
import ChatCoach from "@/components/ChatCoach";

type AppState = "home" | "camera" | "annotate" | "motivation" | "chat";

export default function Home() {
  const [state, setState] = useState<AppState>("home");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleCapture = (imageData: string) => {
    setCapturedImage(imageData);
    setState("annotate");
  };

  const handleAnnotationConfirm = async (
    annotatedImage: string,
    circleRegion: { x: number; y: number; radius: number } | null
  ) => {
    setState("motivation");

    // Analyze image in background
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: capturedImage,
          hasCircle: !!circleRegion,
        }),
      });
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch {
      setAnalysis(null);
    }
    setIsAnalyzing(false);
  };

  const reset = () => {
    setState("home");
    setCapturedImage(null);
    setAnalysis(null);
  };

  return (
    <main className="min-h-screen px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      {state !== "chat" && (
        <header className="text-center mb-8">
          <h1 className="text-3xl font-extrabold gradient-text mb-2">
            ApproachAI
          </h1>
          <p className="text-text-muted text-sm">
            Your AI-powered cold approach wingman
          </p>
        </header>
      )}

      {/* Home Screen */}
      {state === "home" && (
        <div className="space-y-6">
          {/* Hero */}
          <div className="bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 rounded-2xl p-6 text-center">
            <Zap size={48} className="mx-auto mb-4 text-accent" />
            <h2 className="text-2xl font-bold mb-2">
              Stop Overthinking. Start Approaching.
            </h2>
            <p className="text-text-muted leading-relaxed">
              Snap a photo, circle who caught your eye, and get instant
              motivation + a personalized game plan to make your move.
            </p>
          </div>

          {/* Camera CTA */}
          <CameraCapture onCapture={handleCapture} />

          {/* Quick Chat */}
          <button
            onClick={() => setState("chat")}
            className="w-full bg-bg-card hover:bg-bg-card-hover border border-border rounded-2xl p-5 text-left transition"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-primary/20 p-2 rounded-lg">
                <Flame size={20} className="text-primary" />
              </div>
              <h3 className="font-semibold">Just Need a Pep Talk?</h3>
            </div>
            <p className="text-sm text-text-muted">
              Skip the camera — talk directly to your AI approach coach about
              any situation, fear, or excuse holding you back.
            </p>
          </button>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
              <Target size={24} className="mx-auto mb-2 text-primary" />
              <p className="text-xs font-medium">Scene Analysis</p>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
              <Flame size={24} className="mx-auto mb-2 text-accent" />
              <p className="text-xs font-medium">Instant Hype</p>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
              <Zap size={24} className="mx-auto mb-2 text-green-400" />
              <p className="text-xs font-medium">Game Plans</p>
            </div>
          </div>
        </div>
      )}

      {/* Annotate Screen */}
      {state === "annotate" && capturedImage && (
        <ImageAnnotator
          imageData={capturedImage}
          onConfirm={handleAnnotationConfirm}
          onBack={() => {
            setCapturedImage(null);
            setState("home");
          }}
        />
      )}

      {/* Motivation Screen */}
      {state === "motivation" && (
        <div className="space-y-6">
          {/* AI Analysis */}
          {(isAnalyzing || analysis) && (
            <div className="bg-bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <Target size={18} className="text-primary" />
                AI Scene Analysis
              </h3>
              {isAnalyzing ? (
                <div className="flex items-center gap-3 text-text-muted">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Reading the room...</span>
                </div>
              ) : (
                <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
                  {analysis}
                </p>
              )}
            </div>
          )}

          <MotivationPanel
            onStartChat={() => setState("chat")}
            onReset={reset}
            hasImage={!!capturedImage}
          />
        </div>
      )}

      {/* Chat Screen */}
      {state === "chat" && (
        <ChatCoach
          onBack={() => setState(capturedImage ? "motivation" : "home")}
          imageContext={capturedImage}
        />
      )}
    </main>
  );
}
