import type { ChatProvider } from "../llm";

// Nebius Serverless AI exposes an OpenAI-compatible REST API. We call it with the
// runtime's native `fetch` (no SDK): the `openai` SDK's Node http/keep-alive
// transport fails on Cloudflare Workers (workerd) with "Connection error", and a
// plain fetch is portable across Node, workerd, and edge. Two targets, switched
// by env only:
//   - Token Factory (hosted, per-token):  https://api.tokenfactory.nebius.com/v1
//   - A dedicated Serverless AI Endpoint:  http://<endpoint_ip>/v1
const DEFAULT_BASE_URL = "https://api.tokenfactory.nebius.com/v1";
const DEFAULT_MODEL = "Qwen/Qwen3-30B-A3B-Instruct-2507";

interface ChatCompletion {
  choices?: { message?: { content?: string } }[];
}

export const nebiusProvider: ChatProvider = {
  name: "nebius",
  async complete({ system, user, maxTokens }) {
    const apiKey = process.env.NEBIUS_API_KEY;
    if (!apiKey || apiKey.startsWith("nebius-your-key")) {
      throw new Error(
        "NEBIUS_API_KEY is missing or unset. Set it (and optionally NEBIUS_BASE_URL / NEBIUS_MODEL) before screening.",
      );
    }
    const baseURL = (process.env.NEBIUS_BASE_URL ?? DEFAULT_BASE_URL).replace(
      /\/+$/,
      "",
    );
    const model = process.env.NEBIUS_MODEL ?? DEFAULT_MODEL;

    const res = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens ?? 4096,
        temperature: 0.4,
        // Ask for strict JSON; extractJson in llm.ts is the safety net for models
        // that ignore this hint and wrap the object in prose or code fences.
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Nebius API error ${res.status} ${res.statusText}${detail ? `: ${detail.slice(0, 300)}` : ""}`,
      );
    }

    const json = (await res.json()) as ChatCompletion;
    return json.choices?.[0]?.message?.content ?? "";
  },
};
