import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, corsHeaders as baseCorsHeaders, log } from "./core.ts";

// Re-export corsHeaders for backward compatibility with existing imports
export const corsHeaders = baseCorsHeaders;
export { getCorsHeaders };
export interface AuthResult {
  user: { id: string; email?: string } | null;
  error: string | null;
  supabase: SupabaseClient | null;
}

/**
 * Verify the user is authenticated via JWT token
 * Returns user info and authenticated Supabase client
 */
export async function verifyAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    console.log("[Auth] Missing or invalid authorization header");
    return { user: null, error: "Missing or invalid authorization header", supabase: null };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Auth] Server configuration error - missing SUPABASE_URL or SUPABASE_ANON_KEY");
    return { user: null, error: "Server configuration error", supabase: null };
  }

  // Create client with user's auth token
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error("[Auth] Error verifying user:", error.message);
      return { user: null, error: `Authentication failed: ${error.message}`, supabase: null };
    }

    if (!user) {
      console.log("[Auth] No user found in token");
      return { user: null, error: "Invalid or expired token", supabase: null };
    }

    console.log("[Auth] User authenticated:", user.id);
    return { user, error: null, supabase };
  } catch (err) {
    console.error("[Auth] Exception during auth verification:", err);
    return { user: null, error: "Authentication verification failed", supabase: null };
  }
}

/**
 * Create a service role client for admin operations
 * This bypasses RLS - use with caution!
 */
export function createServiceClient(): SupabaseClient | null {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("[Auth] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Verify auth with fallback to service role for internal operations
 * Use this for functions that need to work with user context but also need service role access
 */
export async function verifyAuthWithServiceFallback(req: Request): Promise<AuthResult & { serviceClient: SupabaseClient | null }> {
  const authResult = await verifyAuth(req);
  const serviceClient = createServiceClient();
  
  return {
    ...authResult,
    serviceClient,
  };
}

/**
 * Return unauthorized response
 */
export function unauthorizedResponse(message: string = "Unauthorized"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Return bad request response
 */
export function badRequestResponse(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Return success response
 */
export function successResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Return error response
 */
export function errorResponse(message: string, status: number = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Sanitize HTML content - remove scripts, event handlers, javascript: URLs
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  
  let clean = html;
  // Remove script tags
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  // Remove event handlers
  clean = clean.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "");
  clean = clean.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, "");
  // Remove javascript: URLs
  clean = clean.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  // Limit length
  return clean.substring(0, 50000);
}
