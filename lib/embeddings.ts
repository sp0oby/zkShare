import "server-only";
import {
  embeddingModelId,
  embeddingProviderOptions,
  getOpenAICompatibleClient,
} from "@/lib/llm-client";

/** Must match `vector(...)` on `public.facts.embedding`. */
export const DB_EMBEDDING_DIM = 1536;

/** L2-normalize then pad/truncate to DB dim so pgvector stays consistent across embedding models. */
export function projectEmbeddingToDb(vec: number[], targetDim = DB_EMBEDDING_DIM): number[] {
  if (vec.length === targetDim) {
    const n = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
    return vec.map((x) => x / n);
  }
  if (vec.length > targetDim) {
    const cut = vec.slice(0, targetDim);
    const n = Math.sqrt(cut.reduce((s, x) => s + x * x, 0)) || 1;
    return cut.map((x) => x / n);
  }
  const out = [...vec];
  while (out.length < targetDim) out.push(0);
  const n = Math.sqrt(out.reduce((s, x) => s + x * x, 0)) || 1;
  return out.map((x) => x / n);
}

export async function embedText(text: string): Promise<number[]> {
  const client = await getOpenAICompatibleClient();
  if (!client) {
    return deterministicPseudoEmbedding(text, DB_EMBEDDING_DIM);
  }

  const model = embeddingModelId();

  const providerOpts = embeddingProviderOptions();
  const res = await client.embeddings.create({
    model,
    input: text.slice(0, 8000),
    ...providerOpts,
  } as Parameters<typeof client.embeddings.create>[0]);

  const vec = res.data[0]?.embedding;
  if (!vec?.length) {
    throw new Error("Unexpected empty embedding from provider");
  }

  return projectEmbeddingToDb(vec as number[], DB_EMBEDDING_DIM);
}

/** Literal for Postgres `vector(1536)` columns (Supabase). */
export function toPgVectorString(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

function deterministicPseudoEmbedding(text: string, dim: number): number[] {
  const out = new Array<number>(dim).fill(0);
  for (let i = 0; i < text.length; i++) {
    out[i % dim] += text.charCodeAt(i) / 1000;
  }
  const norm = Math.sqrt(out.reduce((s, x) => s + x * x, 0)) || 1;
  return out.map((x) => x / norm);
}
