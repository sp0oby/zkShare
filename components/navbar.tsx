"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function Navbar() {
  const pathname = usePathname();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-foreground/5">
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 border-2 border-foreground flex items-center justify-center">
            <div className="w-3 h-3 bg-foreground" />
          </div>
          <span className="font-mono font-semibold tracking-tight">
            ZKshare
          </span>
        </Link>

        <div className="flex items-center gap-8">
          <Link
            href="/docs"
            className={cn(
              "text-sm font-mono tracking-wide transition-colors hover:text-foreground",
              pathname === "/docs"
                ? "text-foreground"
                : "text-muted-foreground"
            )}
          >
            Docs
          </Link>
          <Link
            href="/dashboard"
            className={cn(
              "text-sm font-mono tracking-wide transition-colors hover:text-foreground",
              pathname === "/dashboard"
                ? "text-foreground"
                : "text-muted-foreground"
            )}
            title={
              hasSession === false
                ? "Sign in or create an account to open the dashboard"
                : "Dashboard"
            }
          >
            Dashboard
          </Link>
          <Link
            href="/api-key"
            className={cn(
              "text-sm font-mono tracking-wide transition-colors hover:text-foreground",
              pathname === "/api-key"
                ? "text-foreground"
                : "text-muted-foreground"
            )}
          >
            Get API Key
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono tracking-wide text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </nav>
    </header>
  );
}
