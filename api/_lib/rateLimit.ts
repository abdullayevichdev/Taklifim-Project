/** Soft in-memory rate limit (best-effort across warm serverless instances). */
const rateLimitMap = new Map<string, number>();

export function checkRateLimit(key: string, windowMs = 10000): boolean {
  const now = Date.now();
  const lastTime = rateLimitMap.get(key) || 0;
  if (now - lastTime < windowMs) {
    return false;
  }
  rateLimitMap.set(key, now);
  return true;
}
