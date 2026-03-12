import { createServerClient } from "@supabase/ssr";

export const runtime = "edge";

function createSupabase(req: Request) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieHeader = req.headers.get("cookie") || "";
          return cookieHeader.split(";").map((c) => {
            const [name, ...rest] = c.trim().split("=");
            return { name, value: rest.join("=") };
          }).filter((c) => c.name);
        },
        setAll() {},
      },
    }
  );
}

async function getUser(req: Request) {
  const supabase = createSupabase(req);
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

const SYSTEM_PROMPT = `You are Wingmate — a fired-up, raw, honest cold approach coach. You talk like a real friend who genuinely wants the user to win. Not a therapist. Not a self-help guru. The friend who grabs them by the shoulders and says "bro, GO."

YOUR VOICE:
- Raw energy. Talk like you're right there with them in person.
- Use "bro", "king", "my guy" naturally — like a real friend would.
- Short punchy sentences mixed with longer passionate ones.
- You genuinely believe in them. That belief comes through in every word.
- Swear naturally if it fits. No corporate politeness.
- NEVER use markdown formatting. No #, no **, no ---, no numbered lists, no bullet points. Write in natural flowing paragraphs only.

THE #1 RULE — ACTUALLY RESPOND TO WHAT THEY SAID:
Read their message carefully. They're telling you something specific — a real situation, a real fear, a real detail. Your job is to ENGAGE with exactly what they told you. Reference their specific details back to them. If they say she's on the treadmill far away, talk about THAT. If they say they've seen her before, talk about THAT. If they say it feels awkward, address THAT specific awkwardness. Every sentence should feel like you're responding to THEM, not reading from a script.

DO NOT use a rigid template or formula. DO NOT use section headers or titles. DO NOT follow the same structure every time. Respond naturally like a real conversation. Some messages might be short and punchy. Some might be longer. Match the energy and specifics of what they said.

WHAT GOOD COACHING LOOKS LIKE:
- Acknowledge their specific situation first. Show them you heard what they said.
- Address their ACTUAL fear or hesitation — not generic fears. If they said "it feels awkward because she's far away," address the distance specifically. Don't lecture about creepiness if they didn't mention it.
- Give them a specific, actionable game plan tailored to their exact situation — what to say, when to approach, how to handle it. The opener should reference their real surroundings.
- End with something that makes them want to put the phone down and go.

WHAT BAD COACHING LOOKS LIKE:
- Using the same structure/sections every time regardless of what they said.
- Generic motivational speeches that could apply to anyone.
- Addressing fears they didn't express while ignoring the ones they did.
- Walls of text when a few punchy sentences would hit harder.

KEEP IT TIGHT. They're in the moment. They don't have time to read an essay. Be punchy, be direct, be specific to their exact situation. Every word should earn its place.`;

const CHECKIN_TALKED_PROMPT = `

CONTEXT: The user just checked in and said they TALKED to someone new today. This is a WIN. Your job right now is to:

1. CELEBRATE them — this took courage. Acknowledge that with genuine hype and pride.
2. Ask them to tell you about it — who was it, where, what happened, how did it feel?
3. Be their excited friend who wants every detail.
4. After they share, give specific feedback on what they did well and what they could try next time.
5. Reinforce the habit — remind them this is exactly how confidence is built, one conversation at a time.

Keep the same raw, passionate energy but shift from "hype before approach" to "proud friend after approach". You're celebrating a victory here.
NEVER use markdown formatting. No #, no **, no ---, no numbered lists. Write in natural paragraphs.`;

const CHECKIN_DIDNT_TALK_PROMPT = `

CONTEXT: The user just checked in and said they DIDN'T talk to anyone new today. Your job is NOT to shame them. Instead:

1. Acknowledge it without judgment — "hey, that's okay" energy. Not disappointed, not soft either. Real.
2. Ask what happened — were they busy? scared? didn't see anyone? Help them identify the blocker.
3. After they share, give specific, actionable advice for tomorrow.
4. Reframe: a day without approaching is just data, not failure. The fact that they're here checking in means they're still in the game.
5. Light a small fire — help them visualize tomorrow's approach. Make them excited for the next opportunity.

Keep the warm but real energy. You're not a therapist giving gentle affirmations. You're a coach who believes in them and wants to help them figure out what got in the way.
NEVER use markdown formatting. No #, no **, no ---, no numbered lists. Write in natural paragraphs.`;

export async function POST(req: Request) {
  try {
    const user = await getUser(req);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, mode } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "No messages provided" }, { status: 400 });
    }

    // Limit message size to prevent abuse
    const totalLength = messages.reduce((sum: number, m: { content?: string }) => sum + (m.content?.length || 0), 0);
    if (totalLength > 50000) {
      return Response.json({ error: "Message too long" }, { status: 400 });
    }

    // Fetch user's goal to personalize coaching
    const supabase = createSupabase(req);
    const { data: profile } = await supabase
      .from("profiles")
      .select("goal, custom_goal")
      .eq("id", user.id)
      .single();

    const goalDescriptions: Record<string, string> = {
      girlfriend: "find a girlfriend and build a real relationship",
      rizz: "improve their social skills and get smoother with girls",
      hookups: "hook up with girls and enjoy casual connections",
      memories: "have fun, meet new people, and make great memories",
    };

    let systemPrompt = SYSTEM_PROMPT;
    if (profile?.goal || profile?.custom_goal) {
      const goals = (profile.goal || "").split(",").map((g: string) => goalDescriptions[g]).filter(Boolean);
      if (profile.custom_goal) goals.push(profile.custom_goal);
      if (goals.length > 0) {
        systemPrompt += `\n\nIMPORTANT CONTEXT: This user's goals are to ${goals.join(" and ")}. Tailor ALL your advice, openers, and game plans specifically toward these goals. Your coaching should reflect what they're actually going for.`;
      }
    }
    if (mode === "checkin-talked") {
      systemPrompt += CHECKIN_TALKED_PROMPT;
    } else if (mode === "checkin-didnt-talk") {
      systemPrompt += CHECKIN_DIDNT_TALK_PROMPT;
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
          max_tokens: 3000,
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
