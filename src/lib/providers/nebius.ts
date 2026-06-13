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

// Per-run cost guard. At Nebius pricing for Qwen3-30B-A3B (~$0.10/1M input,
// ~$0.30/1M output) a screen is ~8K input + this output cap, i.e. well under
// $0.01/run — far below the $0.25/run ceiling. Output is hard-capped here so no
// single call can blow past that ceiling regardless of caller. (The real total
// spend limit is set on the Nebius Token Factory API key.)
const MAX_OUTPUT_TOKENS = 4096;

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
        // Hard output cap — never exceed MAX_OUTPUT_TOKENS even if a caller asks for more.
        max_tokens: Math.min(maxTokens ?? MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS),
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
