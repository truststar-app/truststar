import { NextRequest, NextResponse } from "next/server";
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
  if (redis) {
    const rlKey = `rl:waitlist:${ip}`;
    const count = await redis.incr(rlKey);
    if (count === 1) await redis.expire(rlKey, 3600);
    if (count > 5) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    await redis.sadd("waitlist-emails", email);
  } else {
    // Fallback: in-memory rate limit only (dev without Redis)
    if (!rateLimit(ip, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const secret = new URL(request.url).searchParams.get("secret");

  if (!secret || !process.env.WAITLIST_SECRET || secret !== process.env.WAITLIST_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ emails: [], total: 0 });
  }

  const emails = await redis.smembers<string[]>("waitlist-emails");
  return NextResponse.json({ emails: emails.sort(), total: emails.length });
}
