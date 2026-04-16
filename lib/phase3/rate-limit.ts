type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

function cleanupExpired(now: number) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function checkRateLimit(namespace: string, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  cleanupExpired(now);

  const bucketKey = `${namespace}:${key}`;
  const current = buckets.get(bucketKey);

  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: 0,
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  current.count += 1;
  buckets.set(bucketKey, current);

  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    retryAfterSeconds: 0,
  };
}
