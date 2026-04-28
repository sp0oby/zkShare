import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="font-mono text-6xl font-semibold mb-4">404</p>
        <h1 className="text-xl font-semibold tracking-tight mb-2">
          Page not found
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-foreground text-background font-mono text-sm hover:bg-foreground/90 transition-colors"
          >
            Home
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center px-6 py-3 border border-foreground/20 font-mono text-sm hover:border-foreground/40 transition-colors"
          >
            Docs
          </Link>
        </div>
      </div>
    </div>
  );
}
