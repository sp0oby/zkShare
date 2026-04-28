import "server-only";
import type OpenAI from "openai";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

/** Prefer OpenRouter when OPENROUTER_API_KEY is set; else OpenAI when OPENAI_API_KEY is set. */
export function llmRouting(): "openrouter" | "openai" | "none" {
  if (process.env.OPENROUTER_API_KEY?.trim()) return "openrouter";
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  return "none";
}

export function externalLlmDisabled(): boolean {
  return (
    process.env.ZKSHARE_DISABLE_EXTERNAL_LLM === "1" ||
    process.env.ZKSHARE_DISABLE_EXTERNAL_LLM === "true"
  );
}

export function openRouterDenyDataCollection(): boolean {
  return process.env.ZKSHARE_OPENROUTER_DENY_DATA_COLLECTION !== "false";
}

/** Chat model: free-tier default on OpenRouter; override with OPENROUTER_CHAT_MODEL / OPENAI_CHAT_MODEL. */
export function chatModelId(): string {
  if (llmRouting() === "openrouter") {
    return (
      process.env.OPENROUTER_CHAT_MODEL?.trim() || "google/gemma-2-9b-it:free"
    );
  }
  return process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini";
}

/** Embedding model on OpenRouter (must match DB vector dim after projection — see lib/embeddings.ts). */
export function embeddingModelId(): string | null {
  if (llmRouting() === "openrouter") {
    const m = process.env.OPENROUTER_EMBEDDING_MODEL?.trim();
    if (m) return m;
    return "nvidia/llama-nemotron-embed-vl-1b-v2:free";
  }
  return process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
}

export async function getOpenAICompatibleClient(): Promise<OpenAI | null> {
  const route = llmRouting();
  if (route === "none") return null;

  const { default: OpenAI } = await import("openai");

  if (route === "openrouter") {
    const key = process.env.OPENROUTER_API_KEY!.trim();
    return new OpenAI({
      apiKey: key,
      baseURL: OPENROUTER_BASE,
      defaultHeaders: {
        ...(process.env.OPENROUTER_HTTP_REFERER?.trim()
          ? { "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER.trim() }
          : {}),
        ...(process.env.OPENROUTER_APP_TITLE?.trim()
          ? { "X-Title": process.env.OPENROUTER_APP_TITLE.trim() }
          : { "X-Title": "ZKshare" }),
      },
    });
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY!.trim() });
}

/** OpenRouter-only: ask providers not to retain prompts when supported. */
export function embeddingProviderOptions():
  | { provider: { data_collection: string } }
  | Record<string, never> {
  if (llmRouting() !== "openrouter" || !openRouterDenyDataCollection()) {
    return {};
  }
  return { provider: { data_collection: "deny" } };
}
