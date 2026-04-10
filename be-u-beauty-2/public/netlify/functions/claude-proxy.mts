import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = Netlify.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();

    // Convert Anthropic format to Gemini format
    const systemPrompt = body.system || "";
    const messages = body.messages || [];
    const maxTokens = body.max_tokens || 1000;

    // Build Gemini contents array
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const geminiBody: any = {
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.8,
      },
    };

    if (systemPrompt) {
      geminiBody.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    const geminiData = await response.json();

    // Convert Gemini response back to Anthropic format
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const anthropicFormat = {
      content: [{ type: "text", text }],
    };

    return new Response(JSON.stringify(anthropicFormat), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Proxy error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
};

export const config = {
  path: "/api/claude",
};
