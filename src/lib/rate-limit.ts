const requests = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  ip: string,
  limit = 30,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const entry = requests.get(ip);
  if (!entry || now > entry.resetTime) {
    requests.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export function getClientIp(request: Request): string {
  const forwarded = (request.headers as Headers).get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
