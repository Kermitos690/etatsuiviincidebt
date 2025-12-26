import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  corsResponse,
  successResponse,
  errorResponse,
  badRequestResponse,
  unauthorizedResponse,
  verifyAuthOrInternal,
  createServiceClient,
  parseJsonBody,
  log,
  ErrorCodes,
} from "../_shared/core.ts";

// ============= Types =============
interface HealthCheck {
  status: string;
  count: number;
  error?: string;
}

interface HealthMetrics {
  timestamp: string;
  status: "healthy" | "degraded" | "warning" | "critical";
  checks: Record<string, HealthCheck>;
  lastSync?: unknown;
  unresolvedAlerts?: number;
}

interface SystemStats {
  timestamp: string;
  emails: { total: number; processed: number };
  incidents: { total: number; open: number };
  analyses: number;
}

// ============= Handlers =============
async function handleHealthCheck(supabase: ReturnType<typeof createServiceClient>): Promise<HealthMetrics> {
  const timestamp = new Date().toISOString();
  const checks: Record<string, HealthCheck> = {};

  // Check main tables
  const tables = ["emails", "incidents", "thread_analyses", "email_attachments"];
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    checks[table] = {
      status: error ? "error" : "ok",
      count: count || 0,
      error: error?.message,
    };
  }

  // Check recent syncs
  const { data: recentSync } = await supabase
    .from("sync_status")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Check unresolved alerts
  const { count: unresolvedAlerts } = await supabase
    .from("audit_alerts")
    .select("*", { count: "exact", head: true })
    .eq("is_resolved", false);

  // Determine overall status
  const hasErrors = Object.values(checks).some((c) => c.status === "error");
  let status: HealthMetrics["status"] = "healthy";

  if (hasErrors) {
    status = "degraded";
  }
  if ((unresolvedAlerts || 0) > 10) {
    status = "warning";
  }

  log("info", "Health check completed", { status, unresolvedAlerts });

  return {
    timestamp,
    status,
    checks,
    lastSync: recentSync || null,
    unresolvedAlerts: unresolvedAlerts || 0,
  };
}

async function handleStats(supabase: ReturnType<typeof createServiceClient>): Promise<SystemStats> {
  const timestamp = new Date().toISOString();

  // Email stats
  const { count: totalEmails } = await supabase
    .from("emails")
    .select("*", { count: "exact", head: true });

  const { count: processedEmails } = await supabase
    .from("emails")
    .select("*", { count: "exact", head: true })
    .eq("processed", true);

  // Incident stats
  const { count: totalIncidents } = await supabase
    .from("incidents")
    .select("*", { count: "exact", head: true });

  const { count: openIncidents } = await supabase
    .from("incidents")
    .select("*", { count: "exact", head: true })
    .eq("statut", "Ouvert");

  // Analysis stats
  const { count: analyses } = await supabase
    .from("thread_analyses")
    .select("*", { count: "exact", head: true });

  log("info", "Stats retrieved", { totalEmails, totalIncidents });

  return {
    timestamp,
    emails: { total: totalEmails || 0, processed: processedEmails || 0 },
    incidents: { total: totalIncidents || 0, open: openIncidents || 0 },
    analyses: analyses || 0,
  };
}

// ============= Main Handler =============
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    // Verify auth (accepts internal secret or JWT)
    const authResult = await verifyAuthOrInternal(req);
    if (authResult.error) {
      return unauthorizedResponse(authResult.error);
    }

    log("info", "Monitoring request", { 
      isInternal: authResult.isInternal,
      userId: authResult.user?.id 
    });

    // Use service role for monitoring operations
    const supabase = createServiceClient();

    // Parse action from body
    const { data: body } = await parseJsonBody<{ action?: string }>(req);
    const action = body?.action || "health-check";

    switch (action) {
      case "health-check": {
        const metrics = await handleHealthCheck(supabase);
        return successResponse(metrics);
      }

      case "stats": {
        const stats = await handleStats(supabase);
        return successResponse(stats);
      }

      default:
        return badRequestResponse(`Unknown action: ${action}`);
    }

  } catch (error) {
    log("error", "Monitoring error", { 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      ErrorCodes.INTERNAL_ERROR,
      500
    );
  }
});
