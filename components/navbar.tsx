"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

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
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 min-w-0 shrink">
          <div className="w-8 h-8 shrink-0 border-2 border-foreground flex items-center justify-center">
            <div className="w-3 h-3 bg-foreground" />
          </div>
          <span className="font-mono font-semibold tracking-tight truncate">
            ZKshare
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6 lg:gap-8 shrink-0">
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
            href="https://github.com/sp0oby/zkShare"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono tracking-wide text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="md:hidden shrink-0 rounded-none border-foreground/15"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(100vw-1rem,20rem)] rounded-none border-foreground/10 p-0">
            <nav className="flex flex-col pt-14 px-4 pb-8 gap-1 font-mono text-sm" aria-label="Mobile">
              <SheetClose asChild>
                <Link
                  href="/docs"
                  className={cn(
                    "py-3 border-b border-foreground/10 text-left",
                    pathname === "/docs" ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  Docs
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link
                  href="/dashboard"
                  className={cn(
                    "py-3 border-b border-foreground/10 text-left",
                    pathname === "/dashboard" ? "text-foreground" : "text-muted-foreground",
                  )}
                  title={
                    hasSession === false
                      ? "Sign in or create an account to open the dashboard"
                      : undefined
                  }
                >
                  Dashboard
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link
                  href="/api-key"
                  className={cn(
                    "py-3 border-b border-foreground/10 text-left",
                    pathname === "/api-key" ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  Get API Key
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <a
                  href="https://github.com/sp0oby/zkShare"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 text-muted-foreground block"
                >
                  GitHub →
                </a>
              </SheetClose>
            </nav>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
