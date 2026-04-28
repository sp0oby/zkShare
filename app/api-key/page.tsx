"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Copy, Check, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { GridBackground } from "@/components/grid-background";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { PRICING } from "@/lib/pricing";

export default function ApiKeyPage() {
  const searchParams = useSearchParams();
  const nextDest = searchParams.get("next");
  const flowParam = searchParams.get("flow");

  const [email, setEmail] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(() =>
    flowParam === "signin" || flowParam === "signup" ? flowParam : null,
  );

  const needsDashboardGate = useMemo(
    () => nextDest === "/dashboard" && !hasSession,
    [nextDest, hasSession],
  );

  const mustPickAuthMode = needsDashboardGate && authMode === null;

  useEffect(() => {
    const flow = searchParams.get("flow");
    if (flow === "signin" || flow === "signup") {
      setAuthMode(flow);
    }
  }, [searchParams]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setSessionEmail(data.session?.user.email ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(!!session);
      setSessionEmail(session?.user.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleGenerate = async () => {
    if (mustPickAuthMode) return;
    if (!hasSession && !email) return;

    setIsGenerating(true);
    setMagicLinkSent(false);
    setAuthError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const res = await fetch("/api/keys", { method: "POST", credentials: "include" });
        const json = (await res.json()) as { success?: boolean; api_key?: string; message?: string };
        if (!res.ok || !json.success || !json.api_key) {
          throw new Error(json.message ?? "Could not create API key");
        }
        setApiKey(json.api_key);
      } else {
        const shouldCreateUser = authMode !== "signin";
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser,
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextDest ?? "/api-key")}`,
          },
        });
        if (error) throw error;
        setMagicLinkSent(true);
      }
    } catch (e) {
      setMagicLinkSent(false);
      const raw =
        e && typeof e === "object" && "message" in e && typeof (e as Error).message === "string"
          ? (e as Error).message
          : "Sign-in could not be completed. Try again in a moment.";
      const code =
        e && typeof e === "object" && "code" in e && typeof (e as { code?: string }).code === "string"
          ? (e as { code: string }).code
          : "";
      const lower = raw.toLowerCase();
      const isRateLimited =
        code === "over_email_send_rate_limit" ||
        lower.includes("rate limit") ||
        lower.includes("too many requests");
      const msg = isRateLimited
        ? "Too many sign-in emails were sent to this address. Please wait a couple of minutes, then try again."
        : raw;
      setAuthError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maskedKey = apiKey
    ? `zk_live_${"*".repeat(28)}${apiKey.slice(-4)}`
    : "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GridBackground />
      <Navbar />

      <main className="pt-24 pb-32 px-6">
        <div className="max-w-xl mx-auto">
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

            <h1 className="text-4xl font-semibold tracking-tight mb-4">
              {nextDest === "/dashboard" ? "Sign in" : "Get API Key"}
            </h1>
            <p
              className={`text-lg text-muted-foreground ${nextDest === "/dashboard" ? "mb-12" : "mb-4"}`}
            >
              {nextDest === "/dashboard"
                ? "Use your email for a magic link. The dashboard does not require an API key — only a signed-in session."
                : `Generate your API key to start using ZKshare. Free tier includes ${PRICING.free.operationsPerMonth.toLocaleString()} operations per month.`}
            </p>
            {nextDest !== "/dashboard" ? (
              <p className="text-sm font-mono text-muted-foreground mb-12">
                Already have an account?{" "}
                <Link href="/api-key?flow=signin" className="text-foreground underline underline-offset-4">
                  Request a sign-in link only
                </Link>
                .
              </p>
            ) : null}
          </motion.div>

          {!apiKey ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="border border-foreground/10 p-8 bg-background"
            >
              <div className="space-y-6">
                {hasSession && nextDest === "/dashboard" ? (
                  <div className="border border-foreground/10 p-4 bg-foreground/[0.02] space-y-3">
                    <p className="text-sm font-mono text-foreground">You&apos;re signed in.</p>
                    <Button
                      type="button"
                      className="w-full font-mono rounded-none bg-foreground text-background"
                      asChild
                    >
                      <Link href="/dashboard">Continue to dashboard</Link>
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Create an API key below only if you need to call the HTTP API — not required to open the dashboard.
                    </p>
                  </div>
                ) : null}

                {mustPickAuthMode ? (
                  <div className="space-y-3 border border-foreground/10 p-4 bg-foreground/[0.02]">
                    <p className="text-sm font-mono text-foreground">
                      Open the dashboard — choose how you want to continue:
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="font-mono rounded-none border-foreground/20"
                        onClick={() => setAuthMode("signin")}
                      >
                        Sign in
                      </Button>
                      <Button
                        type="button"
                        className="font-mono rounded-none bg-foreground text-background"
                        onClick={() => setAuthMode("signup")}
                      >
                        Create account
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sign in only works if you already used this email with ZKshare. New users should
                      create an account.
                    </p>
                  </div>
                ) : null}

                {authMode && needsDashboardGate ? (
                  <p className="text-xs font-mono text-muted-foreground">
                    {authMode === "signin"
                      ? "Signing in — magic link will not create a new account."
                      : "Creating account — we will set up a new workspace for this email."}
                  </p>
                ) : null}

                <div>
                  <label className="block text-sm font-mono mb-2">
                    {hasSession ? "Signed in as" : "Email Address"}
                  </label>
                  <Input
                    type="email"
                    value={hasSession ? (sessionEmail ?? "") : email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="font-mono bg-transparent border-foreground/20 focus:border-foreground/40"
                    readOnly={hasSession}
                    aria-readonly={hasSession}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {hasSession
                      ? "Optional: create an API key below for the HTTP API. Your session is already active."
                      : mustPickAuthMode
                        ? "Choose Sign in or Create account above, then enter your email."
                        : nextDest === "/dashboard"
                          ? "We’ll email you a one-time link. If it doesn’t arrive, check spam or wait a few minutes."
                          : "We will email you a magic link. After you open it, you can create an API key on this page."}
                  </p>
                  {hasSession ? (
                    <p className="text-xs font-mono pt-2">
                      <Link
                        href="/dashboard"
                        className="text-foreground underline underline-offset-4 hover:text-foreground/80"
                      >
                        Open dashboard (usage, keys, billing) →
                      </Link>
                    </p>
                  ) : null}
                </div>

                {authError ? (
                  <p className="text-sm font-mono text-destructive border border-destructive/30 p-4 bg-destructive/5">
                    {authError}
                  </p>
                ) : null}

                {magicLinkSent ? (
                  <p className="text-sm font-mono text-muted-foreground border border-foreground/10 p-4 bg-foreground/[0.02]">
                    {nextDest === "/dashboard" ? (
                      <>
                        Check your inbox and open the magic link — you&apos;ll be redirected to the{" "}
                        <span className="text-foreground">dashboard</span>. You can create an API key later from the
                        dashboard or this page (optional).
                      </>
                    ) : (
                      <>
                        Check your inbox and open the magic link. When you come back here signed in, use{" "}
                        <span className="text-foreground">Generate API Key</span>.
                      </>
                    )}
                  </p>
                ) : null}

                <Button
                  onClick={() => void handleGenerate()}
                  disabled={
                    mustPickAuthMode || (!hasSession && !email.trim()) || isGenerating
                  }
                  className="w-full bg-foreground text-background hover:bg-foreground/90 font-mono"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {hasSession ? "Creating key…" : "Sending…"}
                    </>
                  ) : hasSession ? (
                    "Generate API Key"
                  ) : nextDest === "/dashboard" ? (
                    "Send magic link"
                  ) : (
                    "Send magic link"
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  {hasSession
                    ? "API keys are hashed at rest. By creating a key you agree to the terms of service."
                    : "Email magic link sign-in. By continuing you agree to our terms of service."}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="border border-foreground/10 p-8 bg-background">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-mono font-semibold">Your API Key</h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="p-2 hover:bg-foreground/5 transition-colors border border-foreground/10"
                      aria-label={showKey ? "Hide key" : "Show key"}
                    >
                      {showKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCopy()}
                      className="p-2 hover:bg-foreground/5 transition-colors border border-foreground/10"
                      aria-label="Copy key"
                    >
                      {copied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="font-mono text-sm bg-foreground/[0.02] border border-foreground/10 p-4 break-all">
                  {showKey ? apiKey : maskedKey}
                </div>

                <div className="mt-4 p-4 border border-foreground/20 bg-foreground/[0.02]">
                  <p className="text-sm text-muted-foreground">
                    Store this key securely. You will not be able to see it again
                    after leaving this page.
                  </p>
                </div>
              </div>

              <div className="border border-foreground/10 p-8 bg-background">
                <h2 className="font-mono font-semibold mb-4">Quick Start</h2>
                <div className="font-mono text-sm bg-foreground/[0.02] border border-foreground/10 p-4 overflow-x-auto">
                  <pre className="text-muted-foreground">
                    {`curl -X POST ${typeof window !== "undefined" ? window.location.origin : ""}/api/v1/context \\
  -H "x-api-key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"operation": "store", "fact_key": "test", "value": "hello"}'`}
                  </pre>
                </div>
              </div>

              <div className="flex gap-4">
                <Link
                  href="/docs"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-foreground text-background font-mono text-sm hover:bg-foreground/90 transition-colors"
                >
                  Read the Docs
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setApiKey(null);
                    setEmail("");
                    setMagicLinkSent(false);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 border border-foreground/20 font-mono text-sm hover:border-foreground/40 transition-colors"
                >
                  Generate Another
                </button>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-16 grid grid-cols-3 gap-px bg-foreground/10"
          >
            {[
              { label: "Free Tier", value: `${PRICING.free.operationsPerMonth.toLocaleString()} ops/mo` },
              { label: "Rate Limit", value: `${PRICING.free.requestsPerSecond} req/sec` },
              { label: "Overages", value: "Metered (Stripe)" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-background p-6 text-center"
              >
                <p className="text-2xl font-mono font-semibold">{item.value}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
