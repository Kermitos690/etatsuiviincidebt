import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============= CORS Headers =============
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// ============= Types =============
export interface AuthResult {
  user: { id: string; email?: string } | null;
  error: string | null;
  supabase: SupabaseClient | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

// ============= Error Codes =============
export const ErrorCodes = {
  // Auth errors
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  MISSING_AUTH: "MISSING_AUTH",
  
  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_FIELD: "MISSING_FIELD",
  
  // Database errors
  DB_ERROR: "DB_ERROR",
  NOT_FOUND: "NOT_FOUND",
  DUPLICATE: "DUPLICATE",
  
  // External API errors
  EXTERNAL_API_ERROR: "EXTERNAL_API_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  
  // Server errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  CONFIG_ERROR: "CONFIG_ERROR",
} as const;

// ============= Supabase Client Factory =============
export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!url || !key) {
    throw new Error("Missing Supabase configuration");
  }
  
  return createClient(url, key);
}

export function createAuthenticatedClient(authHeader: string): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  
  if (!url || !anonKey) {
    throw new Error("Missing Supabase configuration");
  }
  
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

// ============= Authentication =============
export async function verifyAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: "Missing or invalid authorization header", supabase: null };
  }

  try {
    const supabase = createAuthenticatedClient(authHeader);
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { user: null, error: "Invalid or expired token", supabase: null };
    }

    return { user, error: null, supabase };
  } catch (err) {
    log("error", "Auth verification failed", { error: err });
    return { user: null, error: "Authentication failed", supabase: null };
  }
}

export function verifyInternalSecret(req: Request): boolean {
  const secret = req.headers.get("x-internal-secret");
  const expectedSecret = Deno.env.get("INTERNAL_CRON_SECRET");
  return !!secret && !!expectedSecret && secret === expectedSecret;
}

export async function verifyAuthOrInternal(req: Request): Promise<AuthResult & { isInternal: boolean }> {
  // Check internal secret first
  if (verifyInternalSecret(req)) {
    const supabase = createServiceClient();
    return { 
      user: { id: "internal", email: "system@internal" }, 
      error: null, 
      supabase,
      isInternal: true 
    };
  }
  
  // Fall back to standard auth
  const authResult = await verifyAuth(req);
  return { ...authResult, isInternal: false };
}

// ============= Response Helpers =============
export function successResponse<T>(data: T, status = 200): Response {
  return new Response(
    JSON.stringify({ success: true, data }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

export function errorResponse(
  message: string, 
  code: string = ErrorCodes.INTERNAL_ERROR, 
  status = 500
): Response {
  log("error", `Error response: ${message}`, { code, status });
  return new Response(
    JSON.stringify({ success: false, error: message, code }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

export function unauthorizedResponse(message = "Unauthorized"): Response {
  return errorResponse(message, ErrorCodes.UNAUTHORIZED, 401);
}

export function badRequestResponse(message: string): Response {
  return errorResponse(message, ErrorCodes.VALIDATION_ERROR, 400);
}

export function notFoundResponse(message = "Resource not found"): Response {
  return errorResponse(message, ErrorCodes.NOT_FOUND, 404);
}

export function corsResponse(): Response {
  return new Response(null, { headers: corsHeaders });
}

// ============= Request Helpers =============
export async function parseJsonBody<T>(req: Request): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await req.json() as T;
    return { data, error: null };
  } catch {
    return { data: null, error: "Invalid JSON body" };
  }
}

export function getQueryParam(req: Request, key: string): string | null {
  const url = new URL(req.url);
  return url.searchParams.get(key);
}

export function getAllQueryParams(req: Request): Record<string, string> {
  const url = new URL(req.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

// ============= Logging =============
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LOG_LEVEL: LogLevel = (Deno.env.get("LOG_LEVEL") as LogLevel) || "info";

export function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[CURRENT_LOG_LEVEL]) return;
  
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...data,
  };
  
  const logFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  logFn(JSON.stringify(logEntry));
}

// ============= Validation Helpers =============
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

export function validateRequired(data: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

// ============= Sanitization =============
export function sanitizeHtml(html: string, maxLength = 50000): string {
  if (!html) return "";
  
  let clean = html;
  // Remove script tags
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  // Remove event handlers
  clean = clean.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "");
  clean = clean.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, "");
  // Remove javascript: URLs
  clean = clean.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  
  return clean.substring(0, maxLength);
}

export function sanitizeString(str: string, maxLength = 1000): string {
  if (!str) return "";
  return str.replace(/[<>]/g, "").substring(0, maxLength);
}

// ============= Rate Limiting (Simple in-memory) =============
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (entry.count >= limit) {
    return false;
  }
  
  entry.count++;
  return true;
}

// ============= Retry Helper =============
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; delayMs?: number; backoff?: boolean } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, backoff = true } = options;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      log("warn", `Retry attempt ${attempt + 1}/${maxRetries} failed`, { error: lastError.message });
      
      if (attempt < maxRetries - 1) {
        const delay = backoff ? delayMs * Math.pow(2, attempt) : delayMs;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// ============= Handler Wrapper =============
export function createHandler(
  handler: (req: Request) => Promise<Response>,
  options: { requireAuth?: boolean; allowInternal?: boolean } = {}
): (req: Request) => Promise<Response> {
  const { requireAuth = false, allowInternal = false } = options;
  
  return async (req: Request): Promise<Response> => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return corsResponse();
    }
    
    try {
      // Check authentication if required
      if (requireAuth) {
        if (allowInternal) {
          const result = await verifyAuthOrInternal(req);
          if (result.error) {
            return unauthorizedResponse(result.error);
          }
        } else {
          const result = await verifyAuth(req);
          if (result.error) {
            return unauthorizedResponse(result.error);
          }
        }
      }
      
      return await handler(req);
    } catch (error) {
      log("error", "Unhandled error in handler", { 
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      });
      return errorResponse(
        error instanceof Error ? error.message : "Internal server error",
        ErrorCodes.INTERNAL_ERROR,
        500
      );
    }
  };
}

// ============= External API Helpers =============
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
