"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { GridBackground } from "@/components/grid-background";

const EFFECTIVE_DATE = "April 28, 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <GridBackground />
      <Navbar />

      <main className="pt-24 pb-24 sm:pb-32 px-4 sm:px-6">
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
              Terms of Service
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
              <h2 className="text-lg font-semibold text-foreground">1. Acceptance</h2>
              <p>
                By accessing the ZKshare API, website, or any related services
                (&quot;Services&quot;), you agree to be bound by these Terms of Service
                (&quot;Terms&quot;). If you do not agree, do not use the Services.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">2. Description of Services</h2>
              <p>
                ZKshare provides a privacy-oriented context API that allows users, AI
                agents, and applications to store encrypted facts, generate signed proof
                envelopes, share verifiable answers, and run semantic search over
                encrypted data. The API is accessed via HTTP using an API key.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">3. API keys and accounts</h2>
              <p>
                You are responsible for safeguarding your API key. Do not share it publicly
                or embed it in client-side code. You are responsible for all activity
                conducted through your API key. Revoke compromised keys immediately from
                your dashboard.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">4. Acceptable use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Use the Services for any unlawful purpose.</li>
                <li>Attempt to reverse-engineer, decompile, or extract secrets from the API.</li>
                <li>Exceed documented rate limits or abuse the free tier to circumvent paid plans.</li>
                <li>Store, process, or transmit content that infringes intellectual property rights.</li>
                <li>Use the Services to collect personal data without lawful basis.</li>
                <li>Interfere with or disrupt the Services or their infrastructure.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">5. Pricing and billing</h2>
              <p>
                Free-tier usage is subject to documented monthly limits. Paid plans are
                billed through Stripe. Overages beyond included operations are metered.
                Prices may change with 30 days&apos; notice. Refunds follow Stripe&apos;s
                standard dispute process.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">6. Data and privacy</h2>
              <p>
                Our handling of your data is described in the{" "}
                <Link href="/privacy" className="text-foreground underline underline-offset-2">
                  Privacy Policy
                </Link>
                . Server-sealed facts are encrypted at rest using AES-256-GCM. Client-sealed
                facts are stored as opaque ciphertext — the server never sees plaintext.
                See <code>SECURITY.md</code> in the repository for the full trust model.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">7. Intellectual property</h2>
              <p>
                The ZKshare source code is released under the MIT License. Your data
                remains yours. We claim no ownership over content you store or process
                through the API.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">8. Disclaimers</h2>
              <p>
                The Services are provided &quot;as is&quot; and &quot;as available.&quot; We make
                no warranties, express or implied, regarding availability, accuracy, or
                fitness for a particular purpose. Cryptographic claims are documented
                honestly in the repository; features labeled as roadmap items are not
                guaranteed.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">9. Limitation of liability</h2>
              <p>
                To the maximum extent permitted by law, ZKshare and its operators shall
                not be liable for any indirect, incidental, special, consequential, or
                punitive damages arising from your use of the Services.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">10. Termination</h2>
              <p>
                We may suspend or terminate your access for violations of these Terms or
                for any reason with reasonable notice. You may stop using the Services at
                any time by revoking your API keys.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">11. Changes to Terms</h2>
              <p>
                We may update these Terms from time to time. Changes take effect when
                posted. Continued use of the Services after changes constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">12. Contact</h2>
              <p>
                For questions about these Terms, open an issue on the{" "}
                <a
                  href="https://github.com/sp0oby/zkShare"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-2"
                >
                  GitHub repository
                </a>{" "}
                or contact the repository owner.
              </p>
            </section>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
