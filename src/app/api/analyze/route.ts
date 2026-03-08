import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

export const runtime = "edge";

export async function POST(req: Request) {
  const { imageData, hasCircle } = await req.json();

  const prompt = hasCircle
    ? `You're ApproachAI, a confident and motivating cold approach coach. The user has taken a photo and circled someone they want to approach.

Analyze the scene and give them:
1. A brief, hype read of the situation (what kind of venue/setting is this?)
2. A personalized, context-aware opening line
3. A quick body language tip
4. One sentence of pure motivation

Keep it punchy, real, and under 120 words. Use a confident, bro-friendly tone. No emojis.`
    : `You're ApproachAI, a confident and motivating cold approach coach. The user has taken a photo of a social scene.

Give them:
1. A quick read of the setting/vibe
2. General tips for approaching in this environment
3. A versatile opening line that works here
4. A motivational push to take action

Keep it punchy, real, and under 120 words. Use a confident, bro-friendly tone. No emojis.`;

  try {
    const result = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: imageData,
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
      maxOutputTokens: 300,
    });

    return Response.json({ analysis: result.text });
  } catch {
    return Response.json(
      {
        analysis:
          "Couldn't analyze the image, but here's what I know — you're already ahead of 99% of guys just by being willing to try. Walk over, smile, and say: \"Hey, I noticed you and I'd regret not coming to say hi. I'm [your name].\" That's it. Simple, direct, confident. Go.",
      },
      { status: 200 }
    );
  }
}
