"use client";

import { useState, useRef, useEffect } from "react";
import { Send, ArrowLeft, Mic, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatCoachProps {
  onBack: () => void;
  imageContext?: string | null;
}

const quickPrompts = [
  "I'm scared of rejection",
  "It's too loud/crowded here",
  "I don't know what to say",
  "She looks busy, should I still approach?",
  "I feel like I'm not good enough",
  "Give me an opening line",
  "What if her friends judge me?",
  "I keep making excuses",
];

export default function ChatCoach({ onBack, imageContext }: ChatCoachProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initial message
    setMessages([
      {
        role: "assistant",
        content: imageContext
          ? "I can see you've spotted someone. Let's get you ready. What's holding you back right now? Tell me exactly what you're feeling — the nervousness, the excuses, all of it. I'm here to cut through the BS and get you moving."
          : "Hey king. I'm your approach coach. Tell me what's going on — where are you, who caught your eye, and what's stopping you from walking over? No judgment here, just real talk and actionable advice.",
      },
    ]);
  }, [imageContext]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: content.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          hasImage: !!imageContext,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        // Parse SSE data
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantContent += parsed.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                  };
                  return updated;
                });
              }
            } catch {
              // Not JSON, might be raw text
              assistantContent += data;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return updated;
              });
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Listen, even my connection glitched — but you know what? That's life throwing curveballs. The point is, you showed up. You're here. Now take that same energy and go talk to her. You've got this.",
        },
      ]);
    }

    setIsLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="bg-bg-card hover:bg-bg-card-hover p-2 rounded-xl border border-border transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="font-bold text-lg">AI Approach Coach</h2>
          <p className="text-xs text-text-muted">Your personal wingman — no BS, just results</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400">Live</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-white rounded-br-md"
                  : "bg-bg-card border border-border text-text rounded-bl-md"
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 size={18} className="animate-spin text-primary" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 2 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="text-xs bg-bg-card hover:bg-bg-card-hover border border-border rounded-full px-3 py-1.5 text-text-muted hover:text-white transition"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tell me what's on your mind..."
          className="flex-1 bg-bg-card border border-border rounded-xl px-4 py-3 text-white placeholder-text-muted focus:outline-none focus:border-primary transition"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-primary hover:bg-primary-dark disabled:opacity-50 text-white p-3 rounded-xl transition"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
