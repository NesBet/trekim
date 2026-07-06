import { NextResponse } from "next/server";

interface RateLimitConfig {
  interval: number;
  maxRequests: number;
}

const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(config: RateLimitConfig = { interval: 60000, maxRequests: 30 }) {
  return async (ip: string): Promise<{ allowed: boolean }> => {
    const now = Date.now();
    const key = ip;
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + config.interval });
      return { allowed: true };
    }

    if (entry.count >= config.maxRequests) {
      return { allowed: false };
    }

    entry.count++;
    return { allowed: true };
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "127.0.0.1";
}

export function withRateLimit(
  handler: (request: Request, ...args: unknown[]) => Promise<NextResponse>,
  config?: RateLimitConfig
) {
  return async (request: Request, ...args: unknown[]) => {
    const ip = getClientIp(request);
    const limiter = rateLimit(config);
    const { allowed } = await limiter(ip);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    return handler(request, ...args);
  };
}
