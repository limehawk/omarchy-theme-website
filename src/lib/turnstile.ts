const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(
  token: string,
  secretKey: string,
  ip?: string
): Promise<boolean> {
  const body: Record<string, string> = {
    secret: secretKey,
    response: token,
  };

  if (ip) {
    body.remoteip = ip;
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result = (await response.json()) as { success: boolean };
  return result.success;
}
