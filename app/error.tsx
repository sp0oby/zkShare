"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="font-mono text-6xl font-semibold mb-4">500</p>
        <h1 className="text-xl font-semibold tracking-tight mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          An unexpected error occurred. If the problem persists, please contact
          support with reference{" "}
          {error.digest ? (
            <code className="font-mono text-foreground">{error.digest}</code>
          ) : (
            "the URL of this page"
          )}
          .
        </p>
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center px-6 py-3 bg-foreground text-background font-mono text-sm hover:bg-foreground/90 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 border border-foreground/20 font-mono text-sm hover:border-foreground/40 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
