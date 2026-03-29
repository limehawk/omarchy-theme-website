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
  const gitUrl = githubUrl.endsWith(".git") ? githubUrl : `${githubUrl}.git`;
  const command = `omarchy-theme-install ${gitUrl}`;

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
    <Card
      className="bg-black/40 p-4 font-mono text-sm cursor-pointer hover:bg-black/55 hover:border-white/15 transition-all"
      onClick={handleCopy}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div>
            <span className="text-green-400/60 select-none mr-2">$</span>
            <span className="text-foreground/90 font-medium">omarchy-theme-install</span>
          </div>
          <div className="text-muted-foreground text-xs pl-5 mt-1 break-all">
            {gitUrl}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => {
            e.stopPropagation();
            handleCopy();
          }}
          aria-label="Copy install command"
          className={copied ? "text-green-400" : ""}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </Card>
  );
}
