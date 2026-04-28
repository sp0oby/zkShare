"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Lock, Zap, Shield, Search, Box, Key } from "lucide-react";
import { GridBackground } from "@/components/grid-background";
import { ZKVisualizer } from "@/components/zk-visualizer";
import { CodeBlock } from "@/components/code-block";
import { FeatureCard } from "@/components/feature-card";
import { Navbar } from "@/components/navbar";
import { PRICING, OVERAGE_USD_PER_OP_MIN, OVERAGE_USD_PER_OP_MAX } from "@/lib/pricing";

const features = [
  {
    title: "Signed proof envelopes",
    description:
      "Prove a property of a private fact (yes / no) with an HMAC-signed envelope. Verifiable by anyone holding the verifier secret, without ever exposing the underlying value.",
    icon: <Lock className="w-5 h-5" />,
  },
  {
    title: "Encrypted semantic search",
    description:
      "AES-GCM at rest, pgvector with the IVFFlat index, and tenant-scoped queries. Server-sealed facts are searchable; client-sealed facts stay opaque to the server.",
    icon: <Search className="w-5 h-5" />,
  },
  {
    title: "Isolated execution",
    description:
      "Run small allow-listed actions inside an isolated VM sandbox with signed attestation metadata. Designed to swap in a real TEE provider without changing the client contract.",
    icon: <Box className="w-5 h-5" />,
  },
  {
    title: "Built for agents",
    description:
      "Share context across tools, sessions, and agent swarms without surfacing raw values to downstream systems. Single-use share tokens are bound to a recipient and expiry.",
    icon: <Zap className="w-5 h-5" />,
  },
  {
    title: "Operator controls",
    description:
      "Hashed API keys, deny-all RLS, audit logs, request-id propagation, sliding-window rate limits, and instant key revocation. The technical hooks compliance regimes ask for.",
    icon: <Shield className="w-5 h-5" />,
  },
  {
    title: "One endpoint, six operations",
    description:
      "store, prove, share, search, verify_proof, and enclave — all through a single POST. OpenAPI 3.1 spec is checked into the repo.",
    icon: <Key className="w-5 h-5" />,
  },
];

const apiExample = `curl -X POST https://api.zkshare.dev/api/v1/context \\
  -H "x-api-key: your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "operation": "prove",
    "user_id": "user_123",
    "fact_key": "vacation_preference",
    "query": "does the user prefer beach vacations?"
  }'`;

const responseExample = `{
  "success": true,
  "operation": "prove",
  "data": { "answer": "yes", "commitment": "0x7f3a9c..." },
  "proof": "base64url-proof-payload...",
  "verified": true,
  "timestamp": "2026-04-28T12:00:00Z",
  "usage": { "calls": 42, "limit": 1000 }
}`;

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <GridBackground />
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-16">
        <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-foreground/20 text-xs font-mono mb-6 bg-background">
              <div className="w-2 h-2 bg-foreground animate-pulse" />
              Production Ready
            </div>
            <h1 className="text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] mb-6 text-balance">
              Zero-knowledge context sharing
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
              A privacy-oriented context API. Store encrypted facts, prove
              properties without revealing them, and share verifiable answers
              between agents — through a single endpoint.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-mono text-sm hover:bg-foreground/90 transition-colors"
              >
                Read the Docs
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/api-key"
                className="inline-flex items-center gap-2 px-6 py-3 border border-foreground/20 font-mono text-sm hover:border-foreground/40 transition-colors"
              >
                Get API Key
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative h-80 lg:h-[400px] border border-foreground/10 bg-background/50"
          >
            <ZKVisualizer />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>proof generation</span>
              <span>verification network</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-3xl font-semibold tracking-tight mb-4">
              Built for privacy-first applications
            </h2>
            <p className="text-muted-foreground max-w-2xl">
              The cryptographic and operational primitives behind a trustworthy
              AI system: encryption at rest, signed proof envelopes,
              tenant-scoped search, audit logs, and an end-to-end-encrypted
              path where the operator never sees plaintext.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-foreground/10">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative py-32 px-6 border-t border-foreground/10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-3xl font-semibold tracking-tight mb-4">
              Pricing that scales with agents
            </h2>
            <p className="text-muted-foreground max-w-3xl">
              Freemium + usage-based overages. Included ops reset monthly; beyond that, metered billing
              typically lands between ${OVERAGE_USD_PER_OP_MIN}–${OVERAGE_USD_PER_OP_MAX} per operation
              (volume discounts on Stripe).
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-foreground/10">
            {[
              {
                name: PRICING.free.label,
                price: "$0",
                ops: `${PRICING.free.operationsPerMonth.toLocaleString()} ops/mo`,
                detail: PRICING.free.highlights.join(" · "),
              },
              {
                name: PRICING.starter.label,
                price: "$19/mo",
                ops: `${PRICING.starter.operationsPerMonth.toLocaleString()} ops/mo`,
                detail: PRICING.starter.highlights.join(" · "),
              },
              {
                name: PRICING.pro.label,
                price: "$49/mo",
                ops: `${PRICING.pro.operationsPerMonth.toLocaleString()} ops/mo`,
                detail: PRICING.pro.highlights.join(" · "),
              },
              {
                name: PRICING.enterprise.label,
                price: "Custom",
                ops: "Unlimited + SLA",
                detail: PRICING.enterprise.highlights.join(" · "),
              },
            ].map((tier, i) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                viewport={{ once: true }}
                className="bg-background p-8 flex flex-col min-h-[280px]"
              >
                <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  {tier.name}
                </p>
                <p className="text-2xl font-semibold mb-1">{tier.price}</p>
                <p className="font-mono text-sm text-foreground mb-4">{tier.ops}</p>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{tier.detail}</p>
                <Link
                  href={tier.name === "Enterprise" ? "/docs" : "/api-key"}
                  className="mt-6 inline-flex items-center justify-center font-mono text-sm border border-foreground/20 px-4 py-2 hover:border-foreground/40 transition-colors"
                >
                  {tier.name === "Enterprise" ? "Contact" : "Start"}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* API Example Section */}
      <section className="relative py-32 px-6 border-t border-foreground/10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-semibold tracking-tight mb-4">
              One endpoint. Five operations.
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Store encrypted facts, generate proofs, share with other agents,
              run semantic search, and execute in confidential compute. All
              through a single API.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <CodeBlock code={apiExample} language="bash" title="Request" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <CodeBlock code={responseExample} language="json" title="Response" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              View full API documentation
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Operations Grid */}
      <section className="relative py-32 px-6 border-t border-foreground/10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-3xl font-semibold tracking-tight mb-4">
              Supported Operations
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-px bg-foreground/10">
            {[
              { op: "store", desc: "Encrypt and embed facts" },
              { op: "prove", desc: "Signed yes / no envelopes" },
              { op: "share", desc: "Time-bound share tokens" },
              { op: "search", desc: "Semantic vector search" },
              { op: "verify_proof", desc: "Validate without plaintext" },
              { op: "enclave", desc: "Isolated execution" },
            ].map((item, i) => (
              <motion.div
                key={item.op}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                viewport={{ once: true }}
                className="bg-background p-6 text-center"
              >
                <code className="text-lg font-mono font-semibold">
                  {item.op}
                </code>
                <p className="text-xs text-muted-foreground mt-2">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-6 border-t border-foreground/10">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-semibold tracking-tight mb-6">
              Start building with ZKshare
            </h2>
            <p className="text-muted-foreground mb-8">
              Get your API key and ship privacy-preserving features in minutes.
              Free tier includes {PRICING.free.operationsPerMonth.toLocaleString()} operations per month.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/api-key"
                className="inline-flex items-center gap-2 px-8 py-4 bg-foreground text-background font-mono text-sm hover:bg-foreground/90 transition-colors"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-foreground/10 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border border-foreground flex items-center justify-center">
              <div className="w-2 h-2 bg-foreground" />
            </div>
            <span className="font-mono text-sm">ZKshare</span>
          </div>
          <div className="flex items-center gap-8 text-sm font-mono text-muted-foreground">
            <Link href="/docs" className="hover:text-foreground transition-colors">
              Docs
            </Link>
            <Link href="/api-key" className="hover:text-foreground transition-colors">
              API Key
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Created by ｓｐｏｏｂｓ
          </p>
        </div>
      </footer>
    </div>
  );
}
