"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

export function CodeBlock({ code, language = "bash", title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-foreground/10 overflow-hidden font-mono text-sm">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-foreground/10 bg-foreground/[0.02]">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          <span className="text-xs text-muted-foreground">{language}</span>
        </div>
      )}
      <div className="relative group">
        <pre className="p-4 overflow-x-auto bg-foreground/[0.02]">
          <code className="text-foreground/80">{code}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity border border-foreground/10 bg-background hover:bg-foreground/5"
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-foreground/60" />
          ) : (
            <Copy className="w-4 h-4 text-foreground/60" />
          )}
        </button>
      </div>
    </div>
  );
}
