export const runtime = "edge";

export async function POST(req: Request) {
  const { imageData } = await req.json();

  if (!imageData) {
    return Response.json({ analysis: "" });
  }

  const apiKey = process.env.DEDALUS_API_KEY;
  if (!apiKey) {
    return Response.json({ analysis: "" });
  }

  const prompt = `Describe this photo in 2-3 sentences. Focus on:
- The setting/location (indoor/outdoor, type of venue)
- The general atmosphere and vibe
- What people in the photo are doing
- Any notable details about the environment

Be specific and factual. Just describe what you see.`;

  try {
    const response = await fetch("https://api.dedaluslabs.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageData },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[analyze] API error:", response.status, errText);
      return Response.json({ analysis: "" });
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "";

    return Response.json({ analysis });
  } catch (e: unknown) {
    console.error("[analyze] error:", e);
    return Response.json({ analysis: "" });
  }
}
