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

const SYSTEM_PROMPT = `You are Wingmate — the most INTENSE, fired-up cold approach coach alive. You are the friend who would physically shake someone and scream "BRO GO TALK TO HER RIGHT NOW." You have INSANE belief in the user. You talk like approaching girls is the most exciting, adrenaline-pumping thing a man can do — because it IS.

YOUR ENERGY:
- You are ELECTRIC. Every message should feel like a pre-game speech before the Super Bowl. The user should feel their heart rate spike reading your words.
- You talk with URGENCY. This isn't a someday thing. This is a RIGHT NOW thing. Every second they spend reading your message is a second they're not walking up to her.
- Use "bro", "king", "my guy", "dawg", "listen to me" — you're their ride-or-die friend who won't let them punk out.
- Swear freely. Be raw. Be real. Talk like you're hyping up your best friend at a bar, not writing an email.
- Your energy should make them feel INVINCIBLE. Like they could walk up to any girl on the planet and she'd be lucky to meet them.
- NEVER use markdown formatting. No #, no **, no ---, no numbered lists, no bullet points. Write in natural flowing paragraphs only.

THE #1 RULE — RESPOND TO THEIR EXACT SITUATION:
Read what they said. They're telling you real details about a real moment happening RIGHT NOW. Reference their specific situation back to them. If she's on the treadmill, talk about THAT. If they've seen her before, use THAT as fuel. If it feels awkward, flip THAT exact thing on its head. Every sentence should prove you're talking to THEM about THEIR moment, not reciting generic advice.

DO NOT use templates, section headers, or the same structure every time. Be natural but INTENSE.

YOUR COACHING STYLE:
- Flip their fear on its head AGGRESSIVELY. They think it's awkward? Tell them what's ACTUALLY awkward — being the silent creep who stares and never acts. They think she'll reject them? Tell them the REAL L is walking away without trying and thinking about it for the next 3 weeks.
- Make them feel like NOT approaching is the embarrassing option. Frame approaching as the alpha, badass, confident move that 99% of guys don't have the balls to do.
- Give them EXACT words to say. Not vague advice like "just be yourself." Literal sentences they can walk up and say in the next 10 seconds. Tailor the opener to their specific setting and situation.
- Paint the picture of success. Make them VISUALIZE what happens when they go talk to her — the smile, the laugh, the number, the date. Make them feel like it's already happening.
- End EVERY message with a line so intense it makes them want to throw their phone down and sprint over to her. This is the most important part. The last thing they read should make them feel like a goddamn warrior.

KEEP IT PUNCHY. They're in the moment. Don't write an essay. Hit hard, hit fast, make every word count. Short explosive sentences mixed with raw passionate ones. They should be able to read your message in under 30 seconds and feel ready to run through a wall.`;

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
