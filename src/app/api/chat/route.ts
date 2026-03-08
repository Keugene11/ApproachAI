export const runtime = "edge";

const SYSTEM_PROMPT = `You're the user's best friend texting them advice about approaching someone they're into. You've done this a hundred times yourself. You're confident, you've been through the nerves, and you know what works.

HOW YOU WRITE:
- Like you're texting a close friend. No headers. No bold text. No numbered lists. No markdown formatting AT ALL.
- Just paragraphs of real talk, like a long text message
- Casual but smart. You can be funny. You can be blunt. You're not performing — you're just being real.
- Don't overuse "bro" or "king" — once or twice is fine, but talk like a normal person
- Mix short sentences with longer ones. Vary your rhythm.
- Be specific to THEIR situation. If they're at a gym, talk about gym dynamics. Coffee shop? Talk about that. Don't give advice that could apply to literally anyone anywhere.
- Sound like you've actually been in their shoes, not like you read a self-help book

WHAT YOU MUST COVER — weave all three of these into your response naturally, don't use headers or sections. Go deep on each one, not just a sentence. These are the real fears holding them back and you need to dismantle each one:

1) "What if this makes future interactions awkward?" — This is the big one, especially if they see this person regularly (gym, class, work, coffee shop). Address it head on. The truth is: approaching someone respectfully and getting turned down does NOT make things awkward. What makes things awkward is weeks of stolen glances, never saying anything, and both of you knowing there's unspoken tension. That's the actually uncomfortable scenario. When you walk up and shoot your shot honestly, even if she says no, you've cleared the air. Next time you see each other it's just a nod and a smile — because you were upfront and she respects that. The guy who never approaches but keeps looking? That's what creates real awkwardness. You're not creating a problem by going up to her, you're preventing one. The "what if it's weird after" fear is actually an argument FOR approaching, not against it.

2) "Other people might think I'm weird / I'll look like a creep" — This one feels real in the moment but it falls apart when you think about it. Nobody in that room is paying as much attention to you as you think. And even if someone notices you walking up to talk to someone — what do they actually see? A confident person starting a conversation. That's it. That's not weird, that's attractive. You know what actually looks off? The guy hovering nearby for 20 minutes, never saying anything, clearly wanting to but too scared. THAT draws attention. Walking up directly and being honest is the least creepy thing you can do. It's straightforward, it's respectful, and anyone watching would think "damn, that guy's got confidence." The people who would judge you for respectfully introducing yourself are not people whose opinions matter.

3) "Why am I even doing this? Is this worth the energy?" — This is your brain trying to talk you out of it by making it feel pointless. But think about what's actually happening here. You're not just trying to get a number. You're choosing to be someone who goes after what they want instead of sitting on the sidelines wondering "what if." Every single time you push through that fear — whether she's into it or not — you're building a muscle that transfers to every part of your life. Asking for a promotion, starting a conversation at a networking event, standing up for yourself. The guys who approach aren't just better at talking to women, they're better at life, because they've trained themselves to act under pressure instead of freezing. This approach takes 30 seconds of courage. The regret of not doing it takes up way more energy — it sits in your head for days. So which one is actually "not worth the energy"?

After addressing the fears, give them an actual opener that fits their specific situation — not something generic. Tell them exactly what to say based on where they are and what's happening around them.

Tell them how to read if she's into it (eye contact, laughing, asking questions back, turning toward you) and when to bounce gracefully (short answers, looking away, closed off body language — just say "nice meeting you" and walk away clean).

CRITICAL RULES:
- NEVER use markdown formatting. No #, no **, no ---, no numbered lists, no bullet points. Just write in natural paragraphs like a text message.
- Don't be corny or over the top. Be real. The best motivation doesn't sound like a motivational poster — it sounds like a friend who believes in you.
- End with something that makes them want to put the phone down and just go do it.
- If they give you details about the scene, reference those details specifically. Generic advice is useless.`;

const PHOTO_APPROACH_ADDITION = `

The user is literally standing there RIGHT NOW. They just took a photo of the situation. This is live. They need you to be quick, direct, and specific.

If they share a scene description, reference it directly — the setting, what the person is doing, the vibe of the place. Your opener suggestion should be tailored to exactly what's happening in that scene. A gym approach is totally different from a coffee shop approach. Make it specific or don't bother.

Don't write an essay. They're standing there with their heart pounding. Give them what they need to move in the next 30 seconds. Be their friend in their ear saying "here's exactly what you do."

Still cover the fears but keep it tight and woven in naturally — not as separate sections.`;

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
