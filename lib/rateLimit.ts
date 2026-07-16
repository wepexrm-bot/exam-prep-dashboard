const rateMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();

  // Periodic cleanup of expired entries to prevent unbounded memory growth
  if (rateMap.size > 1000) {
    const cutoff = Date.now();
    rateMap.forEach((v, k) => {
      if (v.resetAt < cutoff) rateMap.delete(k);
    });
  }

  const entry = rateMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxAttempts) return false;
  entry.count++;
  return true;
}
