"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Check, KeyRound, Activity, Shield, CreditCard } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { GridBackground } from "@/components/grid-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { PRICING } from "@/lib/pricing";

type KeyRow = {
  id: string;
  key_prefix: string;
  revoked_at: string | null;
  monthly_limit: number;
  plan_tier?: string | null;
  calls_this_month: number;
  billing_period_start: string;
  stripe_customer_id?: string | null;
};

export function Dashboard() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingMsg, setBillingMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/keys", { credentials: "include" });
    const json = await res.json();
    if (json.success && Array.isArray(json.keys)) {
      setKeys(json.keys);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const issueKey = async () => {
    setLoading(true);
    const res = await fetch("/api/keys", { method: "POST", credentials: "include" });
    const json = await res.json();
    if (json.success && json.api_key) {
      setNewKey(json.api_key);
    }
    await refresh();
  };

  const copy = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startCheckout = async (tier: "starter" | "pro") => {
    setBillingBusy(true);
    setBillingMsg(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const json = (await res.json()) as { success?: boolean; url?: string; error?: string };
      if (!res.ok || !json.success || !json.url) {
        setBillingMsg(json.error ?? "Could not start checkout");
        return;
      }
      window.location.href = json.url;
    } finally {
      setBillingBusy(false);
    }
  };

  const openBillingPortal = async () => {
    setBillingBusy(true);
    setBillingMsg(null);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as { success?: boolean; url?: string; error?: string };
      if (!res.ok || !json.success || !json.url) {
        setBillingMsg(json.error ?? "Could not open billing portal");
        return;
      }
      window.location.href = json.url;
    } finally {
      setBillingBusy(false);
    }
  };

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/api-key";
  };

  const primary = keys[0];
  const isEnterpriseCap = primary && primary.monthly_limit >= 999_999_000;
  const progressPct =
    primary && !isEnterpriseCap
      ? Math.min(100, (primary.calls_this_month / primary.monthly_limit) * 100)
      : primary
        ? 100
        : 0;
  const tierLabel = primary?.plan_tier ?? "free";
  const canExportAudit = tierLabel === "pro" || tierLabel === "enterprise";
  const hasStripeCustomer = Boolean(primary?.stripe_customer_id);
  const showStarterUpgrade = tierLabel === "free";
  const showProUpgrade = tierLabel === "free" || tierLabel === "starter";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GridBackground />
      <Navbar />

      <main className="pt-24 pb-32 px-6">
        <div className="max-w-5xl mx-auto space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <h1 className="text-4xl font-semibold tracking-tight mb-2">Dashboard</h1>
                <p className="text-muted-foreground max-w-xl">
                  Usage, keys, and billing context. Plans: Free ({PRICING.free.operationsPerMonth.toLocaleString()} ops),
                  Starter ($19), Pro ($49), Enterprise (custom). Metered overages on Stripe.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" className="font-mono border-foreground/20" onClick={() => void signOut()}>
                  Sign out
                </Button>
                {canExportAudit ? (
                  <Button
                    variant="outline"
                    className="font-mono border-foreground/20"
                    asChild
                  >
                    <a href="/api/audit/export" download>
                      Export audit (CSV)
                    </a>
                  </Button>
                ) : null}
                <Button className="font-mono bg-foreground text-background hover:bg-foreground/90" onClick={() => void issueKey()}>
                  <KeyRound className="w-4 h-4 mr-2" />
                  New API key
                </Button>
              </div>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="lg:col-span-2"
            >
              <Card className="border-foreground/10 rounded-none shadow-none bg-background">
                <CardHeader className="border-b border-foreground/10">
                  <CardTitle className="font-mono text-base flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Usage
                  </CardTitle>
                  <CardDescription>
                    Monthly call count against your plan limit (resets with billing period).
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {loading ? (
                    <p className="text-sm font-mono text-muted-foreground">Loading…</p>
                  ) : primary ? (
                    <>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
                            Calls this month
                          </p>
                          <p className="text-3xl font-semibold tabular-nums">
                            {primary.calls_this_month}
                            <span className="text-muted-foreground text-lg font-normal">
                              {" "}
                              /{" "}
                              {isEnterpriseCap ? "∞" : primary.monthly_limit.toLocaleString()}
                            </span>
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                          <Badge variant="outline" className="rounded-none font-mono border-foreground/20 capitalize">
                            {tierLabel}
                          </Badge>
                          <Badge variant="outline" className="rounded-none font-mono border-foreground/20">
                            {primary.revoked_at ? "Revoked" : "Active"}
                          </Badge>
                        </div>
                      </div>
                      {!isEnterpriseCap ? (
                        <Progress value={progressPct} className="h-2 rounded-none bg-foreground/5" />
                      ) : (
                        <p className="text-xs font-mono text-muted-foreground">
                          Enterprise — usage tracked; limits per contract.
                        </p>
                      )}
                      <p className="text-xs font-mono text-muted-foreground">
                        Prefix <span className="text-foreground">{primary.key_prefix}…</span> · period{" "}
                        {primary.billing_period_start}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No keys yet. Create one to see usage here.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
            >
              <Card className="border-foreground/10 rounded-none shadow-none bg-background h-full">
                <CardHeader className="border-b border-foreground/10">
                  <CardTitle className="font-mono text-base flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Security
                  </CardTitle>
                  <CardDescription>Zero-knowledge context API — secrets never leave your control plane.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-3 text-sm text-muted-foreground">
                  <p>Keys are hashed at rest. Raw values are never returned from `/api/v1/context`.</p>
                  <p className="font-mono text-xs border border-foreground/10 p-3 bg-foreground/[0.02]">
                    Revoke compromised keys instantly in Supabase or add a revoke endpoint when you&apos;re ready.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {tierLabel !== "enterprise" ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.12 }}
            >
              <Card className="border-foreground/10 rounded-none shadow-none bg-background">
                <CardHeader className="border-b border-foreground/10">
                  <CardTitle className="font-mono text-base flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Plan & billing
                  </CardTitle>
                  <CardDescription>
                    Upgrade in one click while signed in. Uses Stripe Checkout; limits update automatically after
                    payment (webhook). Configure <span className="font-mono">STRIPE_PRICE_*</span> in production.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {billingMsg ? (
                    <p className="text-sm font-mono text-destructive border border-destructive/30 p-3 bg-destructive/5">
                      {billingMsg}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-3">
                    {showStarterUpgrade ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="font-mono rounded-none border-foreground/20"
                        disabled={billingBusy}
                        onClick={() => void startCheckout("starter")}
                      >
                        Starter — ${PRICING.starter.monthlyUsd}/mo
                      </Button>
                    ) : null}
                    {showProUpgrade ? (
                      <Button
                        type="button"
                        className="font-mono rounded-none bg-foreground text-background hover:bg-foreground/90"
                        disabled={billingBusy}
                        onClick={() => void startCheckout("pro")}
                      >
                        Pro — ${PRICING.pro.monthlyUsd}/mo
                      </Button>
                    ) : null}
                    {hasStripeCustomer ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="font-mono rounded-none"
                        disabled={billingBusy}
                        onClick={() => void openBillingPortal()}
                      >
                        Manage billing
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">
                    Local dev: set <span className="text-foreground">STRIPE_SECRET_KEY</span>, price IDs, webhook to{" "}
                    <span className="text-foreground">/api/webhooks/stripe</span>, and enable the Customer Portal in
                    Stripe Dashboard.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : null}

          {newKey ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-foreground/10 p-6 bg-background"
            >
              <div className="flex items-center justify-between gap-4 mb-3">
                <h2 className="font-mono font-semibold">New key (copy now)</h2>
                <Button size="sm" variant="outline" className="rounded-none font-mono" onClick={() => void copy()}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <pre className="text-xs font-mono break-all border border-foreground/10 p-4 bg-foreground/[0.02]">
                {newKey}
              </pre>
            </motion.div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
