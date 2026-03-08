"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface InstallCommandProps {
  githubUrl: string;
}

export function InstallCommand({ githubUrl }: InstallCommandProps) {
  const [copied, setCopied] = useState(false);
  const command = `omarchy theme install ${githubUrl}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  return (
    <div className="group relative rounded-lg border border-border/50 bg-black/40 p-4 font-mono text-sm">
      <div className="flex items-center gap-3">
        <span className="text-green-400/70 select-none">$</span>
        <code className="text-foreground/90 flex-1 overflow-x-auto">
          {command}
        </code>
        <button
          onClick={handleCopy}
          className={cn(
            "shrink-0 rounded-md p-1.5 transition-colors",
            copied
              ? "text-green-400"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
          aria-label="Copy install command"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </div>
    </div>
  );
}
