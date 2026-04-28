import "server-only";
import { embedText } from "@/lib/embeddings";
import { decryptFactRow } from "@/lib/encryption";
import { answerYesNoFromPlaintext } from "@/lib/zk";
import { chatModelId, externalLlmDisabled, getOpenAICompatibleClient } from "@/lib/llm-client";

export type FactSearchRow = {
  id: string;
  fact_key: string;
  commitment: string;
  ciphertext: string;
  iv: string;
  auth_tag: string;
  embedding: string | number[] | null;
  /** When true, ciphertext was sealed on the client; server must not decrypt for summaries. */
  client_encrypted?: boolean;
};

export type RankedFactRow = FactSearchRow & { similarity?: number };

function parseEmbedding(raw: FactSearchRow["embedding"]): number[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw as number[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw.replace(/^\[/, "[").replace(/\]$/, "]")) as unknown;
      if (Array.isArray(parsed)) return parsed.map((x) => Number(x));
    } catch {
      /* fallthrough */
    }
  }
  return null;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function summarizeMatch(query: string, plaintext: string): Promise<string> {
  if (externalLlmDisabled()) {
    await answerYesNoFromPlaintext(query, plaintext);
    return "Related match (external summarization disabled for privacy).";
  }
  const client = await getOpenAICompatibleClient();
  if (!client) {
    await answerYesNoFromPlaintext(query, plaintext);
    return "Related match (paraphrased for privacy).";
  }
  const completion = await client.chat.completions.create({
    model: chatModelId(),
    temperature: 0,
    max_tokens: 64,
    messages: [
      {
        role: "system",
        content:
          "Summarize how PRIVATE_FACT relates to QUERY in one short sentence. Never quote the fact verbatim; paraphrase.",
      },
      {
        role: "user",
        content: `QUERY: ${query}\nPRIVATE_FACT: ${plaintext.slice(0, 4000)}`,
      },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() ?? "Match found.";
}

/** pgvector RPC already ranked rows — hydrate answers only (production path). */
export async function hydrateSearchResults(input: {
  query: string;
  rows: RankedFactRow[];
}): Promise<{ fact_key: string; relevance: number; answer: string }[]> {
  const top = input.rows.slice(0, 8);
  const out: { fact_key: string; relevance: number; answer: string }[] = [];
  for (const row of top) {
    if (row.client_encrypted) {
      const rel = Math.round((row.similarity ?? 0) * 1000) / 1000;
      out.push({
        fact_key: row.fact_key,
        relevance: rel,
        answer:
          "Client-sealed fact — answer is not available from the server. Decrypt locally if you need details.",
      });
      continue;
    }
    const plain = decryptFactRow(row as unknown as Record<string, unknown>);
    const answer = await summarizeMatch(input.query, plain);
    const rel = Math.round((row.similarity ?? 0) * 1000) / 1000;
    out.push({ fact_key: row.fact_key, relevance: rel, answer });
  }
  return out;
}

export async function semanticSearchOverFacts(input: {
  query: string;
  rows: FactSearchRow[];
}): Promise<{ fact_key: string; relevance: number; answer: string }[]> {
  const qVec = await embedText(input.query);
  const scored: { row: FactSearchRow; score: number }[] = [];
  for (const row of input.rows) {
    if (row.client_encrypted) continue;
    const ev = parseEmbedding(row.embedding);
    if (ev && ev.length === qVec.length) {
      scored.push({ row, score: cosine(qVec, ev) });
    } else {
      scored.push({
        row,
        score: row.fact_key.toLowerCase().includes(input.query.toLowerCase()) ? 0.2 : 0,
      });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > 0).slice(0, 8);
  const ranked: RankedFactRow[] = top.map(({ row, score }) => ({ ...row, similarity: score }));
  return hydrateSearchResults({ query: input.query, rows: ranked });
}
