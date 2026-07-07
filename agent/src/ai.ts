import OpenAI from "openai";

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY environment variable is required");
}

export const ai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export async function parseIntent(
  intentText: string
): Promise<{ amount: string; riskPreference: string; action: string }> {
  const prompt = `
Parse this natural language staking intent into structured data.
Intent: "${intentText}"

Extract:
1. amount: The CSPR amount to stake (numeric string, no unit)
2. riskPreference: "conservative", "moderate", or "aggressive"
3. action: "stake", "route", or "swap"

Respond with valid JSON only, no markdown:
{"amount": "10", "riskPreference": "conservative", "action": "stake"}
`;

  let retries = 1;
  while (retries >= 0) {
    try {
      const response = await ai.chat.completions.create({
        model: "anthropic/claude-sonnet-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from OpenRouter");
      }

      const parsed = JSON.parse(content.trim());
      return {
        amount: parsed.amount || "0",
        riskPreference: parsed.riskPreference || "moderate",
        action: parsed.action || "stake",
      };
    } catch (err) {
      if (retries > 0) {
        retries--;
        console.warn("[ai] Parse failed, retrying once:", err);
      } else {
        throw new Error(`Failed to parse intent after retries: ${err}`);
      }
    }
  }

  throw new Error("Should not reach here");
}

export async function explainRoute(
  intent: string,
  route: {
    action: string;
    target: string;
    amount: string;
    reason: string;
  }
): Promise<string> {
  const prompt = `
A liquid staking AI agent received this intent and built this route proposal.
Explain in one sentence why this route is appropriate.

User intent: "${intent}"
Route action: ${route.action}
Target contract: ${route.target}
Amount (CSPR): ${route.amount}
Reason: ${route.reason}

Respond with a single clear sentence (no "I think" or hedging).
`;

  const response = await ai.chat.completions.create({
    model: "anthropic/claude-sonnet-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 100,
  });

  return response.choices[0]?.message?.content || route.reason;
}
