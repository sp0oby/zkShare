"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { MessageCircle, X, Send, ArrowRight } from "lucide-react";

type Msg = { role: "bot" | "user"; text: string };

const QUICK_REPLIES = [
  "How do I get an API key?",
  "What operations are available?",
  "What is E2EE / client-sealed?",
  "How does prove work?",
  "What are the pricing tiers?",
  "How do I use this with my agent?",
];

type FaqEntry = {
  keywords: string[];
  answer: string;
};

const FAQ: FaqEntry[] = [
  {
    keywords: ["api key", "get key", "create key", "generate key", "sign up", "get started"],
    answer:
      "Head to the [API Key](/api-key) page, sign in with your email (magic link), and click **Create API key**. The raw key is shown once — copy it and store it securely. All requests use the `x-api-key` header.",
  },
  {
    keywords: ["operations", "what can", "features", "endpoints", "what does"],
    answer:
      "ZKshare has six operations through a single `POST /api/v1/context` endpoint:\n\n• **store** — encrypt and save a fact\n• **prove** — signed yes/no answer without revealing data\n• **share** — prove + time-bound share token\n• **search** — semantic search over encrypted facts\n• **verify_proof** — validate a proof without plaintext\n• **sandbox** — isolated code execution with attestation",
  },
  {
    keywords: ["e2ee", "client sealed", "client-sealed", "end to end", "end-to-end", "encrypt"],
    answer:
      "Client-sealed (E2EE) facts are encrypted on your side before sending. The server only stores ciphertext, IV, auth tag, commitment, and your supplied embedding — it **never** sees plaintext. You supply the encryption key; the server cannot decrypt. Use this for maximum privacy.",
  },
  {
    keywords: ["prove", "proof", "verify", "hmac", "zero knowledge", "zk"],
    answer:
      "When you call **prove**, the server checks your fact, derives a yes/no answer to your query, and returns a signed HMAC-SHA256 envelope binding the commitment + query + answer. Anyone can call **verify_proof** to validate the envelope without ever seeing the original data. Groth16 SNARKs for structured predicates are on the roadmap.",
  },
  {
    keywords: ["pricing", "cost", "free", "plan", "tier", "price", "pay", "billing", "subscription"],
    answer:
      "**Free** — 1,000 ops/month, no credit card needed.\n**Starter** ($19/mo) — 20,000 ops/month, chat support.\n**Pro** ($49/mo) — 100,000 ops/month, priority support, audit log export.\n**Enterprise** — custom limits, SLA, dedicated integrations.\n\nManage your plan from the [dashboard](/api-key).",
  },
  {
    keywords: ["agent", "openai", "langchain", "function calling", "tool", "integrate", "sdk"],
    answer:
      'Register ZKshare as a tool/function in any agent framework (OpenAI, LangChain, CrewAI, Vercel AI SDK). Your agent only needs the API key — no SDK, no extra dependencies. See the **Agent Integration** section in the [docs](/docs#agent-integration) for a copy-paste example.',
  },
  {
    keywords: ["search", "semantic", "vector", "pgvector", "find"],
    answer:
      "The **search** operation runs semantic similarity search over your server-sealed facts using pgvector. Send a natural-language query and get ranked results with relevance scores. Client-sealed facts are excluded from server-side search since the server can't read them.",
  },
  {
    keywords: ["sandbox", "enclave", "execute", "isolated", "vm", "action"],
    answer:
      "The **sandbox** operation runs small allow-listed functions inside an isolated `node:vm` context (no host I/O, 50ms timeout). Each response includes a signed HS256 JWT attestation. Every response advertises `provider: vm-sandbox` — this is software isolation, not hardware TEE.",
  },
  {
    keywords: ["share", "token", "recipient", "time-bound", "single use"],
    answer:
      "**share** works like prove but also generates a single-use, time-bound share token tied to a recipient agent ID. The token expires after 7 days. Use it to securely pass verified answers between agents without exposing the underlying fact.",
  },
  {
    keywords: ["rate limit", "throttle", "429", "too many"],
    answer:
      "Rate limits depend on your tier: Free = 10 req/s, Starter = 30 req/s, Pro = 100 req/s, Enterprise = custom SLA. If you hit the limit you'll get a `429` response with a `Retry-After` header. Monthly operation limits are enforced per account across all your API keys.",
  },
  {
    keywords: ["revoke", "compromised", "delete key", "remove key"],
    answer:
      'You can revoke any API key from the [dashboard](/api-key). Click the **Revoke** button next to the key — it takes effect immediately and cannot be undone. Any requests using that key will be rejected.',
  },
  {
    keywords: ["audit", "export", "log", "csv"],
    answer:
      "Every API call is logged with the operation type, key ID, user ID, and request ID (never plaintext). Pro and Enterprise tiers can export audit logs as CSV from the dashboard. The export includes up to 50,000 recent entries.",
  },
  {
    keywords: ["open source", "github", "source code", "repo", "license"],
    answer:
      "ZKshare is open source under the MIT License. The full source code, including cryptographic implementations and migrations, is available on [GitHub](https://github.com/sp0oby/zkShare).",
  },
];

const GREETING: Msg = {
  role: "bot",
  text: "Hi! I can help you with ZKshare. Pick a question below or type your own.",
};

function matchFaq(input: string): string | null {
  const q = input.toLowerCase();
  let bestScore = 0;
  let bestAnswer: string | null = null;

  for (const entry of FAQ) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw)) score += kw.split(" ").length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestAnswer = entry.answer;
    }
  }

  return bestScore > 0 ? bestAnswer : null;
}

function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|\n|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part === "\n") return <br key={i} />;
    const bold = part.match(/^\*\*(.+)\*\*$/);
    if (bold) return <strong key={i} className="text-foreground">{bold[1]}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <Link
          key={i}
          href={link[2]}
          className="text-foreground underline underline-offset-2 hover:text-foreground/80"
        >
          {link[1]}
        </Link>
      );
    }
    const code = part.match(/^`([^`]+)`$/);
    if (code) {
      return (
        <code key={i} className="px-1 py-0.5 bg-foreground/10 text-foreground text-xs font-mono">
          {code[1]}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMsg: Msg = { role: "user", text: trimmed };
      const answer = matchFaq(trimmed);
      const botMsg: Msg = {
        role: "bot",
        text:
          answer ??
          "I don't have a specific answer for that. You can check the [docs](/docs) for detailed information, or open an issue on [GitHub](https://github.com/sp0oby/zkShare) and we'll help you out.",
      };

      setMessages((prev) => [...prev, userMsg, botMsg]);
      setInput("");
    },
    [],
  );

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-foreground text-background flex items-center justify-center shadow-lg hover:bg-foreground/90 transition-colors"
          aria-label="Open chat support"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[520px] border border-foreground/10 bg-background shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/10 bg-foreground/[0.02]">
            <div>
              <p className="text-sm font-mono font-semibold">ZKshare Support</p>
              <p className="text-xs text-muted-foreground">Ask anything about the API</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 hover:bg-foreground/5 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[340px]">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-foreground text-background"
                      : "bg-foreground/[0.04] border border-foreground/10 text-muted-foreground"
                  }`}
                >
                  {renderMarkdown(msg.text)}
                </div>
              </div>
            ))}

            {/* Quick replies after greeting */}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-mono border border-foreground/10 text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
                  >
                    {q}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex border-t border-foreground/10"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a question..."
              className="flex-1 px-4 py-3 text-xs font-mono bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-3 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
