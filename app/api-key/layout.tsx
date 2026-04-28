import { Suspense } from "react";

export default function ApiKeyLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center font-mono text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
