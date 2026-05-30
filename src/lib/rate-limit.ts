import { getRedis } from "@/lib/redis";

const mem = new Map<string, { count: number; resetTime: number }>();

// C-1: Redis-backed rate limit with in-memory fallback
// H-1: x-real-ip used first (x-forwarded-for is forgeable on non-Vercel infra)
export async function rateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000
): Promise<boolean> {
  const windowSec = Math.ceil(windowMs / 1000);
  const redis = getRedis();

  if (redis) {
    const redisKey = `ts:rl:${limit}:${windowSec}:${key}`;
    try {
      // H-1: Use pipeline so INCR and EXPIRE are sent atomically in one round-trip.
      // This prevents the race where INCR succeeds but EXPIRE never runs, leaving the
      // key without a TTL and permanently blocking the IP.
      const [count] = await redis
        .pipeline()
        .incr(redisKey)
        .expire(redisKey, windowSec)
        .exec() as [number, number];
      return count <= limit;
    } catch {
      // Redis failure — fall through to in-memory
    }
  }

  const now = Date.now();
  const entry = mem.get(key);
  if (!entry || now > entry.resetTime) {
    mem.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export function getClientIp(request: Request): string {
  const headers = request.headers as Headers;
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim().slice(0, 64);
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 64);
  return "unknown";
}
