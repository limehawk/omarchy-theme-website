"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateFingerprint } from "@/lib/fingerprint";

interface UpvoteButtonProps {
  themeId: string;
  initialCount: number;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          size?: string;
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export function UpvoteButton({ themeId, initialCount }: UpvoteButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);
  const turnstileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const votedThemes = JSON.parse(
      localStorage.getItem("omarchy_voted") || "[]"
    );
    if (votedThemes.includes(themeId)) {
      setVoted(true);
    }
  }, [themeId]);

  const getTurnstileToken = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!window.turnstile || !turnstileRef.current) {
        reject(new Error("Turnstile not loaded"));
        return;
      }

      const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
      if (!siteKey) {
        reject(new Error("Turnstile site key not configured"));
        return;
      }

      const widgetId = window.turnstile.render(turnstileRef.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          window.turnstile?.remove(widgetId);
          resolve(token);
        },
        "error-callback": () => {
          window.turnstile?.remove(widgetId);
          reject(new Error("Turnstile challenge failed"));
        },
        size: "invisible",
      });
    });
  }, []);

  async function handleUpvote() {
    if (voted || loading) return;

    setLoading(true);
    try {
      const [fingerprint, turnstileToken] = await Promise.all([
        generateFingerprint(),
        getTurnstileToken(),
      ]);

      const res = await fetch("/api/upvote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme_id: themeId,
          turnstile_token: turnstileToken,
          fingerprint_hash: fingerprint,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        upvote_count?: number;
      };

      if (data.success) {
        setCount(data.upvote_count ?? count);
        setVoted(true);
        setAnimating(true);
        setTimeout(() => setAnimating(false), 600);

        const votedThemes = JSON.parse(
          localStorage.getItem("omarchy_voted") || "[]"
        );
        votedThemes.push(themeId);
        localStorage.setItem("omarchy_voted", JSON.stringify(votedThemes));
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleUpvote}
        disabled={voted || loading}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-mono text-sm transition-all",
          voted
            ? "border-green-500/30 bg-green-500/10 text-green-400 cursor-default"
            : "border-border/50 bg-card hover:border-foreground/30 hover:bg-card/80 text-muted-foreground hover:text-foreground",
          loading && "opacity-50 cursor-wait",
          animating && "scale-110"
        )}
        aria-label={voted ? "Already upvoted" : "Upvote this theme"}
      >
        <ArrowUp
          className={cn(
            "size-4 transition-transform",
            animating && "-translate-y-0.5"
          )}
        />
        <span>{count}</span>
      </button>
      <div ref={turnstileRef} className="hidden" />
    </>
  );
}
