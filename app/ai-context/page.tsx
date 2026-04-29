import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { GridBackground } from "@/components/grid-background";
import { CodeBlock } from "@/components/code-block";
import { getAiAssistantBriefingText } from "@/lib/ai-briefing";

export const metadata: Metadata = {
  title: "Briefing for AI assistants",
  description:
    "Plain-text ZKshare context for ChatGPT, Grok, Claude, and Cursor—HTTPS API, MCP, and trust assumptions.",
};

export default function AiContextPage() {
  const briefing = getAiAssistantBriefingText();
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://zkshare.io";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GridBackground />
      <Navbar />

      <main className="pt-24 pb-24 sm:pb-32 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Docs
          </Link>

          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
            Briefing for AI assistants
          </h1>
          <p className="text-sm text-muted-foreground font-mono mb-8 max-w-2xl leading-relaxed">
            Copy everything below once and paste it into Grok, ChatGPT, Claude, or your
            team&apos;s onboarding doc. Same text is exposed at{" "}
            <a
              href={`${site}/llms.txt`}
              className="text-foreground underline underline-offset-2 hover:no-underline"
            >
              {site}/llms.txt
            </a>{" "}
            (<code className="text-foreground/80">text/plain</code>) for tools that ingest
            <code className="ml-1">llms.txt</code> URLs.
          </p>

          <CodeBlock
            code={briefing}
            language="plaintext"
            title="ZKshare — paste into Grok / ChatGPT / Claude"
          />
        </div>
      </main>
    </div>
  );
}
