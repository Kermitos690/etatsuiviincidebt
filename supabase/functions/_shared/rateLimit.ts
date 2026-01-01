import { getCorsHeaders, corsHeaders } from "./core.ts";

/**
 * Simple in-memory rate limiter for edge functions
 * Uses a sliding window approach with configurable limits
 */

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (resets on cold starts, but provides basic protection)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const cleanupInterval = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < cleanupInterval) return;
  
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check if request should be rate limited
 * @param identifier - Unique identifier (e.g., IP, user ID)
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { windowMs: 60000, maxRequests: 30 }
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup();
  
  const now = Date.now();
  const key = identifier;
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetAt < now) {
    // Create new entry
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs
    });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }
  
  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  
  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header or falls back to a default
 */
export function getClientIdentifier(req: Request, prefix: string = ""): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `${prefix}:${ip}`;
}

/**
 * Rate limit response
 */
export function rateLimitResponse(resetAt: number, req?: Request): Response {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      retryAfter
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        ...getCorsHeaders(req)
      }
    }
  );
}

// Pre-configured rate limits for different function types
export const RATE_LIMITS = {
  // Standard API calls: 60 per minute
  standard: { windowMs: 60000, maxRequests: 60 },
  
  // Heavy operations (sync, analysis): 10 per minute
  heavy: { windowMs: 60000, maxRequests: 10 },
  
  // AI operations: 20 per minute
  ai: { windowMs: 60000, maxRequests: 20 },
  
  // Public webhooks: 30 per minute per IP
  webhook: { windowMs: 60000, maxRequests: 30 },
  
  // Auth operations: 10 per minute (prevent brute force)
  auth: { windowMs: 60000, maxRequests: 10 },
  
  // Export operations: 5 per minute
  export: { windowMs: 60000, maxRequests: 5 }
};
