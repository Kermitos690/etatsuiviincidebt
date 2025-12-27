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
  alertsCreated?: number;
}

interface SystemStats {
  timestamp: string;
  emails: { total: number; processed: number };
  incidents: { total: number; open: number };
  analyses: number;
}

// ============= Alert Thresholds =============
const ALERT_THRESHOLDS = {
  unresolvedAlerts: 10,       // Alert if more than 10 unresolved alerts
  syncAgeHours: 24,           // Alert if no sync in 24 hours
  errorRatePercent: 20,       // Alert if error rate exceeds 20%
  pendingEmails: 100,         // Alert if more than 100 unprocessed emails
};

// ============= Handlers =============
async function handleHealthCheck(supabase: ReturnType<typeof createServiceClient>): Promise<HealthMetrics> {
  const timestamp = new Date().toISOString();
  const checks: Record<string, HealthCheck> = {};
  let alertsCreated = 0;

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

  // Check pending (unprocessed) emails
  const { count: pendingEmails } = await supabase
    .from("emails")
    .select("*", { count: "exact", head: true })
    .eq("processed", false);

  // Determine overall status and create alerts if needed
  const hasErrors = Object.values(checks).some((c) => c.status === "error");
  let status: HealthMetrics["status"] = "healthy";

  if (hasErrors) {
    status = "degraded";
    // Create system alert
    await createSystemAlert(supabase, {
      title: "Dégradation système détectée",
      description: `Des erreurs ont été détectées dans les tables: ${Object.entries(checks).filter(([_, c]) => c.status === "error").map(([t]) => t).join(", ")}`,
      severity: "warning",
      alertType: "system_degraded"
    });
    alertsCreated++;
  }

  if ((unresolvedAlerts || 0) > ALERT_THRESHOLDS.unresolvedAlerts) {
    status = "warning";
  }

  if ((pendingEmails || 0) > ALERT_THRESHOLDS.pendingEmails) {
    status = status === "healthy" ? "warning" : status;
    await createSystemAlert(supabase, {
      title: "Backlog d'emails non traités",
      description: `${pendingEmails} emails en attente de traitement. Vérifiez l'analyse IA.`,
      severity: "warning",
      alertType: "backlog_high"
    });
    alertsCreated++;
  }

  // Check sync age
  if (recentSync) {
    const syncAge = Date.now() - new Date(recentSync.created_at).getTime();
    const syncAgeHours = syncAge / (1000 * 60 * 60);
    
    if (syncAgeHours > ALERT_THRESHOLDS.syncAgeHours) {
      status = status === "healthy" ? "warning" : status;
      await createSystemAlert(supabase, {
        title: "Synchronisation Gmail inactive",
        description: `Dernière synchronisation il y a ${Math.round(syncAgeHours)} heures. Vérifiez la configuration Gmail.`,
        severity: "warning",
        alertType: "sync_stale"
      });
      alertsCreated++;
    }
  }

  log("info", "Health check completed", { status, unresolvedAlerts, alertsCreated });

  return {
    timestamp,
    status,
    checks,
    lastSync: recentSync || null,
    unresolvedAlerts: unresolvedAlerts || 0,
    alertsCreated,
  };
}

// Create system alert if not already exists recently
async function createSystemAlert(
  supabase: ReturnType<typeof createServiceClient>,
  params: { title: string; description: string; severity: string; alertType: string }
) {
  // Check if similar alert exists in last 4 hours
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  
  const { data: existing } = await supabase
    .from("audit_alerts")
    .select("id")
    .eq("alert_type", params.alertType)
    .eq("is_resolved", false)
    .gte("created_at", fourHoursAgo)
    .limit(1);

  if (existing && existing.length > 0) {
    log("info", "Alert already exists, skipping", { alertType: params.alertType });
    return;
  }

  await supabase
    .from("audit_alerts")
    .insert({
      title: params.title,
      description: params.description,
      severity: params.severity,
      alert_type: params.alertType,
      user_id: null, // System alert, no specific user
    });

  log("info", "System alert created", { alertType: params.alertType });
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
