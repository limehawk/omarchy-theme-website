import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { recordUpvote, checkIpRateLimit } from "@/lib/db";
import { verifyTurnstile } from "@/lib/turnstile";

async function hashString(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: NextRequest) {
  let body: { theme_id?: string; turnstile_token?: string; fingerprint_hash?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { theme_id, turnstile_token, fingerprint_hash } = body;

  if (!theme_id || !turnstile_token || !fingerprint_hash) {
    return NextResponse.json(
      { error: "Missing required fields: theme_id, turnstile_token, fingerprint_hash" },
      { status: 400 }
    );
  }

  const { env } = await getCloudflareContext({ async: true });
  const db = env.DB as D1Database;
  const turnstileSecret = env.TURNSTILE_SECRET_KEY as string;

  if (!turnstileSecret) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Get client IP
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;

  // Verify Turnstile
  const turnstileValid = await verifyTurnstile(
    turnstile_token,
    turnstileSecret,
    ip ?? undefined
  );

  if (!turnstileValid) {
    return NextResponse.json(
      { error: "Turnstile verification failed" },
      { status: 403 }
    );
  }

  // Hash IP and check rate limit
  const ipHash = ip ? await hashString(ip) : null;

  if (ipHash) {
    const rateLimited = await checkIpRateLimit(db, ipHash, 20);
    if (rateLimited) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again tomorrow." },
        { status: 429 }
      );
    }
  }

  // Record upvote (UNIQUE constraint on theme_id + fingerprint_hash rejects duplicates)
  try {
    const upvoteCount = await recordUpvote(db, theme_id, fingerprint_hash, ipHash);
    return NextResponse.json({ success: true, upvote_count: upvoteCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("UNIQUE constraint failed")) {
      return NextResponse.json(
        { error: "Already upvoted this theme" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to record upvote" },
      { status: 500 }
    );
  }
}
