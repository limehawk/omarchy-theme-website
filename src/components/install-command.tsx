"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <Card className="bg-black/40 p-4 font-mono text-sm">
      <div className="flex items-center gap-3">
        <span className="text-green-400/70 select-none">$</span>
        <code className="text-foreground/90 flex-1 overflow-x-auto">
          {command}
        </code>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleCopy}
          aria-label="Copy install command"
          className={copied ? "text-green-400" : ""}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </Card>
  );
}
