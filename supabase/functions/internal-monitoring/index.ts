import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérification du secret interne pour les appels cron
    const internalSecret = req.headers.get("x-internal-secret");
    const expectedSecret = Deno.env.get("INTERNAL_CRON_SECRET");
    
    // Si pas de secret interne, vérifier l'auth normale
    if (!internalSecret || internalSecret !== expectedSecret) {
      const authHeader = req.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Utiliser le service role pour le monitoring
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { action = "health-check" } = await req.json().catch(() => ({}));
    const timestamp = new Date().toISOString();

    if (action === "health-check") {
      const checks: Record<string, { status: string; count: number; error?: string }> = {};
      
      const healthMetrics: {
        timestamp: string;
        status: string;
        checks: typeof checks;
        lastSync?: unknown;
        unresolvedAlerts?: number;
      } = {
        timestamp,
        status: "healthy",
        checks,
      };

      // Vérifier les tables principales
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

      // Vérifier les sync récentes
      const { data: recentSync } = await supabase
        .from("sync_status")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      healthMetrics.lastSync = recentSync || null;

      // Vérifier les alertes non résolues
      const { count: unresolvedAlerts } = await supabase
        .from("audit_alerts")
        .select("*", { count: "exact", head: true })
        .eq("is_resolved", false);

      healthMetrics.unresolvedAlerts = unresolvedAlerts || 0;

      // Déterminer le statut global
      const hasErrors = Object.values(checks).some((c) => c.status === "error");
      
      if (hasErrors) {
        healthMetrics.status = "degraded";
      }
      if ((unresolvedAlerts || 0) > 10) {
        healthMetrics.status = "warning";
      }

      // Log du monitoring
      console.log(`[MONITORING] ${timestamp} - Status: ${healthMetrics.status} - Alerts: ${unresolvedAlerts}`);

      return new Response(JSON.stringify(healthMetrics), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "stats") {
      const stats: Record<string, unknown> = { timestamp };

      // Stats emails
      const { count: totalEmails } = await supabase
        .from("emails")
        .select("*", { count: "exact", head: true });

      const { count: processedEmails } = await supabase
        .from("emails")
        .select("*", { count: "exact", head: true })
        .eq("processed", true);

      stats.emails = { total: totalEmails || 0, processed: processedEmails || 0 };

      // Stats incidents
      const { count: totalIncidents } = await supabase
        .from("incidents")
        .select("*", { count: "exact", head: true });

      const { count: openIncidents } = await supabase
        .from("incidents")
        .select("*", { count: "exact", head: true })
        .eq("statut", "Ouvert");

      stats.incidents = { total: totalIncidents || 0, open: openIncidents || 0 };

      // Stats analyses
      const { count: analyses } = await supabase
        .from("thread_analyses")
        .select("*", { count: "exact", head: true });

      stats.analyses = analyses || 0;

      return new Response(JSON.stringify(stats), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Action non reconnue" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[MONITORING ERROR]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
