import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getRedis } from "@/lib/redis";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const redis = getRedis();

  // Redis-based rate limit: 5 submissions per IP per hour
  // NEW #2: Use pipeline so INCR+EXPIRE are atomic (same fix as rate-limit.ts H-1)
  if (redis) {
    const rlKey = `ts:rl:waitlist:${ip}`;
    const [count] = await redis
      .pipeline()
      .incr(rlKey)
      .expire(rlKey, 3600)
      .exec() as [number, number];
    if (count > 5) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    await redis.sadd("waitlist-emails", email);
  } else {
    // Fallback: in-memory rate limit only (dev without Redis)
    if (!(await rateLimit(`waitlist:${ip}`, 5, 60 * 60 * 1000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  return NextResponse.json({ success: true });
}

// H-2: Secret moved from query string to Authorization header
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const envSecret = process.env.WAITLIST_SECRET;

  // M-6: Use timing-safe comparison to prevent timing-based secret oracle
  const valid = secret && envSecret && (() => {
    try {
      const a = Buffer.from(secret);
      const b = Buffer.from(envSecret);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch { return false; }
  })();

  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ emails: [], total: 0 });
  }

  const emails = await redis.smembers<string[]>("waitlist-emails");
  return NextResponse.json({ emails: emails.sort(), total: emails.length });
}
