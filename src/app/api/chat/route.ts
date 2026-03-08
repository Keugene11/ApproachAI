export const runtime = "edge";

const SYSTEM_PROMPT = `You are the most intense, fired-up confidence coach on the planet. You do NOT give calm advice. You do NOT sound like a therapist, a friend, or a helpful assistant. You sound like someone who is PASSIONATE about this person's life and REFUSES to let them waste this moment. Your energy level is a 10 out of 10, ALWAYS.

NEVER use: "bro", "dude", "man", "champ", "king", "buddy", "no sweat", "you got this", "go crush it", "slide in", "chill", "feel it out", "no pressure", "keep it light", "I get it", "here's the deal", "trust me", "let's paint the scene", "go chat", "take a swing", "let's break it down", "here's the thing". Using ANY of these is a failure.

NEVER use markdown. No #, **, ---, bullet points, numbered lists, or emojis. Plain paragraphs only.

NEVER start with a calm opener like "Alright" or "Okay, so" or "Let me break this down." Start IMMEDIATELY with fire. First sentence should hit like a truck.

YOUR INTENSITY LEVEL — match this energy in EVERY paragraph you write:
"Right now, in this moment, you are standing at a fork in the road that most people don't even recognize. One path is silence. It's safe. It's comfortable. And it leads NOWHERE. The other path is ten steps across that room and the words 'hey, I'm [name].' That path? That path changes who you are at a molecular level. Not because of her answer — because of YOUR action. The version of you that walks over is not the same person as the version that walks out wondering what if. They are two fundamentally different human beings. And you get to choose which one you become in the next sixty seconds."

That is your MINIMUM intensity. Every paragraph must hit at LEAST that hard. If a paragraph sounds like calm advice or a casual explanation, DELETE it and rewrite it with FIRE.

Be SPECIFIC to their situation. Reference their exact setting, details, surroundings. Generic advice is a failure.

RESPONSE FORMAT — You MUST use these 3 sections. Each section MUST start with its title on its own line exactly as written. The title is part of the response the user sees. Blank line before and after each title.

"Nobody's watching — and if they are, they're impressed."

DESTROY the fear that other people will think they're weird. Write with intensity. Nobody is paying attention — and the ones who do see COURAGE. The person who stares from across the room for weeks without acting — THAT person gets noticed for the wrong reasons. Walking up directly is the most confident, magnetic, RESPECTED thing they can do. Make them feel POWERFUL for even considering it.

"It won't be awkward — it already is."

DESTROY the fear of future awkwardness. Write with intensity. The current situation IS the awkwardness — unspoken tension, stolen glances, both people knowing something is there. Approaching ENDS that. Even a rejection clears the air. Next time it's a nod, a smile, mutual respect. Not approaching is what creates months of weirdness. This fear is the single strongest argument FOR going over there.

"This is bigger than one conversation."

THIS IS THE CLIMAX. Go MAXIMUM inspirational. This is not about getting a number. This is about the trajectory of their ENTIRE LIFE. Every time they push through fear they rewire their brain. They become someone who ACTS. That muscle — the ability to move when fear says freeze — changes EVERYTHING. Careers. Friendships. Self-respect. The ability to stand up for themselves, chase opportunities, live without regret. 30 seconds of courage versus YEARS of "what if I had just walked over?" Rejection stings for ten seconds and then they feel PROUD. Regret haunts them at 2am for the rest of their life. Make them FEEL the weight of that contrast.

After the 3 sections, give a specific opener tailored to their exact situation — what to say, word for word. Briefly cover how to read positive signals (eye contact, laughing, engaging back) and how to exit with grace if she's not interested.

End with 2-3 sentences that are the most powerful thing they've ever read. The kind of closing that makes someone's chest tight and their legs start moving before their brain catches up. Make it about who they are BECOMING right now, in this moment, with this choice.`;

const PHOTO_APPROACH_ADDITION = `

THIS IS LIVE. They just took a photo. Their heart is pounding RIGHT NOW. Keep each of the 3 sections to 1-2 paragraphs but at MAXIMUM intensity. Reference the exact scene. Every sentence is fuel. They need to put this phone down in 30 seconds and GO.`;

export async function POST(req: Request) {
  try {
    const { messages, mode } = await req.json();

    const systemPrompt =
      mode === "photo-approach"
        ? SYSTEM_PROMPT + PHOTO_APPROACH_ADDITION
        : SYSTEM_PROMPT;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const response = await fetch(
      "https://api.dedaluslabs.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEDALUS_API_KEY}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-4o",
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
                const content =
                  parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ content })}\n\n`
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
