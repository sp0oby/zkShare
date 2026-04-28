"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { GridBackground } from "@/components/grid-background";

const EFFECTIVE_DATE = "April 28, 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <GridBackground />
      <Navbar />

      <main className="pt-24 pb-32 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>

            <h1 className="text-4xl font-semibold tracking-tight mb-2">
              Privacy Policy
            </h1>
            <p className="text-sm text-muted-foreground font-mono mb-12">
              Effective {EFFECTIVE_DATE}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-muted-foreground"
          >
            <section>
              <h2 className="text-lg font-semibold text-foreground">What we collect</h2>
              <p>
                <strong className="text-foreground">Account creation:</strong> your email
                address (for magic-link authentication). We do not collect passwords.
              </p>
              <p>
                <strong className="text-foreground">API usage:</strong> each API call is
                logged with the operation type, API key identifier, logical user ID, and a
                request ID. Fact plaintext is <em>never</em> included in audit logs.
              </p>
              <p>
                <strong className="text-foreground">Billing:</strong> payment processing is
                handled by Stripe. We store your Stripe customer ID — not your card details.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">How your data is stored</h2>
              <p>
                <strong className="text-foreground">Server-sealed facts:</strong> encrypted
                at rest with AES-256-GCM. The encryption key is held in the application
                process and never exposed to the database layer. Facts are decrypted in
                memory only when you call <code>prove</code>, <code>share</code>, or
                generate a search summary.
              </p>
              <p>
                <strong className="text-foreground">Client-sealed (E2EE) facts:</strong>{" "}
                stored as opaque ciphertext blobs. The server never receives or derives
                plaintext, and never calls an embedding model on the fact. Decryption
                requires your own key, which never leaves your control.
              </p>
              <p>
                <strong className="text-foreground">API keys:</strong> stored as SHA-256
                hashes. The raw key is shown once at creation and never persisted.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Third-party services</h2>
              <p>Depending on how the operator configures the deployment:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong className="text-foreground">Supabase</strong> — authentication
                  and PostgreSQL database hosting.
                </li>
                <li>
                  <strong className="text-foreground">Stripe</strong> — payment processing
                  for paid plans.
                </li>
                <li>
                  <strong className="text-foreground">OpenAI or OpenRouter</strong>{" "}
                  (optional) — embedding generation and yes/no answer derivation for{" "}
                  <code>prove</code>, <code>share</code>, and <code>search</code>{" "}
                  operations on <em>server-sealed facts only</em>. When configured, fact
                  plaintext and queries may be sent to these providers. This can be
                  disabled entirely with{" "}
                  <code>ZKSHARE_DISABLE_EXTERNAL_LLM=true</code>.
                </li>
                <li>
                  <strong className="text-foreground">Upstash</strong> (optional) — Redis
                  for rate limiting.
                </li>
              </ul>
              <p>
                Client-sealed facts are never sent to any third-party LLM. For maximum
                privacy, operators can disable external LLMs and require client-supplied
                embeddings.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Cookies</h2>
              <p>
                We use Supabase Auth session cookies for dashboard sign-in. We do not use
                tracking cookies or third-party analytics cookies. Vercel Analytics (when
                enabled in production) collects anonymized page-view data with no
                personally identifiable information.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Data retention</h2>
              <p>
                Facts and audit logs are retained for as long as your account is active.
                You can delete individual facts by overwriting them (upsert with the same
                key) or by contacting the operator. API keys can be revoked at any time
                from the dashboard.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Your rights</h2>
              <p>
                Depending on your jurisdiction, you may have the right to access, correct,
                delete, or export your personal data. To exercise these rights, contact the
                operator through the{" "}
                <a
                  href="https://github.com/sp0oby/zkShare"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-2"
                >
                  GitHub repository
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Changes</h2>
              <p>
                We may update this Privacy Policy from time to time. Changes take effect
                when posted. Continued use of the Services after changes constitutes
                acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Contact</h2>
              <p>
                Questions about this policy? Open an issue on the{" "}
                <a
                  href="https://github.com/sp0oby/zkShare"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-2"
                >
                  GitHub repository
                </a>{" "}
                or contact the repository owner. For security issues, see{" "}
                <Link href="/docs" className="text-foreground underline underline-offset-2">
                  SECURITY.md
                </Link>
                .
              </p>
            </section>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
