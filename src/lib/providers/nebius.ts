import OpenAI from "openai";
import type { ChatProvider } from "../llm";

// Nebius Serverless AI exposes an OpenAI-compatible API, so the standard `openai`
// SDK works by pointing baseURL at your endpoint. Two supported targets, switched
// purely by env (no code change):
//   - Token Factory (hosted, per-token):  https://api.tokenfactory.nebius.com/v1
//   - A dedicated Serverless AI Endpoint:  http://<endpoint_ip>/v1
const DEFAULT_BASE_URL = "https://api.tokenfactory.nebius.com/v1";
const DEFAULT_MODEL = "Qwen/Qwen3-30B-A3B-Instruct-2507";

let _client: OpenAI | null = null;

function client(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.NEBIUS_API_KEY;
  if (!apiKey || apiKey.startsWith("nebius-your-key")) {
    throw new Error(
      "NEBIUS_API_KEY is missing or unset. Set it (and optionally NEBIUS_BASE_URL / NEBIUS_MODEL) before screening.",
    );
  }
  _client = new OpenAI({
    baseURL: process.env.NEBIUS_BASE_URL ?? DEFAULT_BASE_URL,
    apiKey,
  });
  return _client;
}

export const nebiusProvider: ChatProvider = {
  name: "nebius",
  async complete({ system, user, maxTokens }) {
    const model = process.env.NEBIUS_MODEL ?? DEFAULT_MODEL;
    const res = await client().chat.completions.create({
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
    });
    return res.choices[0]?.message?.content ?? "";
  },
};
