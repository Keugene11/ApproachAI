import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { isPro } from "@/lib/subscription";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const runtime = "edge";

const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

// Per-user: 30 requests per hour
const ratelimit = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "1 h"), analytics: true })
  : null;

// Global kill-switch: cap total chat requests per day across all users so a
// runaway attack can't drain Anthropic credits overnight. Override via
// MAX_CHAT_REQUESTS_PER_DAY env var.
const GLOBAL_DAILY_LIMIT = parseInt(process.env.MAX_CHAT_REQUESTS_PER_DAY || "2000", 10);
const globalLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(GLOBAL_DAILY_LIMIT, "1 d"),
      prefix: "rl:chat:global",
      analytics: true,
    })
  : null;

const SYSTEM_PROMPT = `You are Wingmate, a coach who helps guys work up the courage to go talk to girls in real life.

Talk like a friend who's been there — warm, direct, a little fired up. Keep replies short and conversational. If they give you any situation at all, run with it and hand them something specific to say or do. Don't interrogate them.

Push toward action. A guy opens this app because he's stuck in his head; your job is to unstick him.

No markdown, no bullet lists, no headers — just talk.`;

const CHECKIN_TALKED_PROMPT = `\n\nThe user just checked in that they talked to someone new today. Celebrate the win, get the story, then give them one thing to try next time.`;

const CHECKIN_DIDNT_TALK_PROMPT = `\n\nThe user just checked in that they didn't talk to anyone new today. No shame, no lecture. Find out what got in the way and help them set up tomorrow.`;

const PLAN_PROMPT = `\n\nThe user is refining their 4-week plan through conversation. You can directly change fields on their plan by emitting update directives in your reply. The app parses these and applies them to the user's profile immediately.

The fields you can change:
- weekly_approach_goal: integer 1-20 (how many girls they want to talk to per week)
- blocker: "rejection" | "words" | "confidence" | "time" (what stops them)
- location: "city" | "suburb" | "town" | "rural" (their setting)
- status: "student" | "working" | "other" (what they do)
- plan_note: a short free-text personal focus under 120 characters

Format — one update per line, at the end of your reply, exactly like this (no bullet, no quotes around the value):
UPDATE weekly_approach_goal=3
UPDATE blocker=words
UPDATE plan_note=Say hi to the girl at the gym before Friday

Rules for every reply:
1. Keep it to 2-3 sentences of natural conversation. Acknowledge what they said, then (if appropriate) emit the UPDATE lines.
2. ONLY emit UPDATE lines when the user clearly asked for a change or confirmed a proposal. If they're venting or describing, just chat — no updates.
3. Never update a field the user didn't mention or agree to.
4. For plan_note, write a specific, this-week, actionable sentence tailored to what they told you.
5. At most ONE follow-up question per reply. Don't interrogate.
6. Never acknowledge the UPDATE directive syntax to the user — it's invisible machinery.`;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    if (!(await isPro(userId))) {
      return Response.json({ error: "Pro subscription required" }, { status: 403 });
    }

    if (globalLimit) {
      const { success } = await globalLimit.limit("global");
      if (!success) {
        return Response.json({ error: "AI coach is temporarily unavailable. Try again later." }, { status: 503 });
      }
    }

    if (ratelimit) {
      const { success } = await ratelimit.limit(userId);
      if (!success) {
        return Response.json({ error: "Slow down — too many requests. Try again in a few minutes." }, { status: 429 });
      }
    }

    const { messages, mode } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "No messages provided" }, { status: 400 });
    }

    if (messages.some((m: { content?: string }) => (m.content?.length || 0) > 2000)) {
      return Response.json({ error: "Message too long" }, { status: 400 });
    }
    const totalLength = messages.reduce((sum: number, m: { content?: string }) => sum + (m.content?.length || 0), 0);
    if (totalLength > 50000) {
      return Response.json({ error: "Message too long" }, { status: 400 });
    }

    // Fetch user's goal to personalize coaching
    const profileRows = await sql`
      SELECT goal, custom_goal FROM profiles
      WHERE id = ${userId}
      LIMIT 1
    `;
    const profile = profileRows[0] ?? null;

    const goalDescriptions: Record<string, string> = {
      girlfriend: "find a girlfriend and build a real relationship",
      rizz: "improve their social skills and get smoother with girls",
      hookups: "meet more people, date casually, and enjoy new connections",
      memories: "have fun, meet new people, and make great memories",
    };

    let systemPrompt = SYSTEM_PROMPT;
    if (profile?.goal || profile?.custom_goal) {
      const goals = (profile.goal || "").split(",").map((g: string) => goalDescriptions[g]).filter(Boolean);
      if (profile.custom_goal) goals.push(profile.custom_goal);
      if (goals.length > 0) {
        systemPrompt += `\n\nThis user's goal: ${goals.join(" and ")}. Keep your advice aligned with that.`;
      }
    }
    if (mode === "checkin-talked") {
      systemPrompt += CHECKIN_TALKED_PROMPT;
    } else if (mode === "checkin-didnt-talk") {
      systemPrompt += CHECKIN_DIDNT_TALK_PROMPT;
    } else if (mode === "plan") {
      systemPrompt += PLAN_PROMPT;
    }

    const apiMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          system: systemPrompt,
          messages: apiMessages,
          max_tokens: 1500,
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[chat] API error:", response.status, errorText);
      return new Response(
        `data: ${JSON.stringify({ content: `Error: ${response.status} — ${errorText}` })}\n\ndata: [DONE]\n\n`,
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        }
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return new Response(
        `data: ${JSON.stringify({ content: "No response stream available." })}\n\ndata: [DONE]\n\n`,
        { headers: { "Content-Type": "text/event-stream" } }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ content: parsed.delta.text })}\n\n`
                    )
                  );
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Stream error";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ content: `\n\n[Error: ${msg}]` })}\n\n`
            )
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      `data: ${JSON.stringify({ content: `Error: ${msg}` })}\n\ndata: [DONE]\n\n`,
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      }
    );
  }
}
