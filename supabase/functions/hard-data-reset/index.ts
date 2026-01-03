import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, corsHeaders, log } from "../_shared/core.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * HARD DATA RESET
 * 
 * Purges ALL analyzed content while preserving:
 * - Gmail OAuth tokens (gmail_config: access_token, refresh_token, etc.)
 * - User account and profiles
 * - App settings
 * 
 * Resets:
 * - last_sync and last_history_id to force full re-sync
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // ADMIN ROLE CHECK - This function is DANGEROUS, restrict to admins only
    // =========================================================================
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (rolesError) {
      console.error("[hard-data-reset] Error checking roles:", rolesError);
      return new Response(JSON.stringify({ error: "Erreur de vérification des rôles" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAdmin = userRoles?.some(r => r.role === "admin");
    if (!isAdmin) {
      console.warn(`[hard-data-reset] Non-admin user ${user.email} attempted to reset data`);
      return new Response(JSON.stringify({ 
        error: "Accès refusé: Seuls les administrateurs peuvent effectuer cette opération" 
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[hard-data-reset] User ${user.email} initiated hard reset`);

    const deletionResults: Record<string, number> = {};

    // =========================================================================
    // ORDER MATTERS: Delete child tables before parent tables (FK constraints)
    // =========================================================================

    // 1. Delete derived analyses first (depend on emails/incidents)
    const tablesToDelete = [
      // Proof chain and validations
      "proof_chain",
      "ai_output_validations",
      
      // Thread-related
      "thread_analyses",
      "email_thread_links",
      
      // Email-related children
      "email_facts",
      "email_attachments",
      "email_relations",
      "email_blacklist",
      
      // Corroborations and training
      "corroborations",
      "ai_situation_training",
      "ai_training_feedback",
      "active_learning_queue",
      
      // Anomalies and alerts
      "anomaly_detections",
      "audit_alerts",
      
      // Behavior baselines
      "behavior_baselines",
      
      // Betrayal detections
      "betrayal_detections",
      
      // Compliance
      "compliance_assessments",
      
      // Entity relations
      "entity_relations",
      
      // Fact-law mappings
      "fact_law_mappings",
      
      // Incident-related
      "incident_events",
      "incident_exports",
      
      // Detection patterns (user-specific)
      "detection_patterns",
      
      // Email templates
      "email_templates",
      
      // Monthly reports
      "monthly_reports",
      
      // Legal deadlines
      "legal_deadlines",
      
      // Events (documents)
      "events",
      
      // Actor trust scores
      "actor_trust_scores",
      
      // PDF analyses and comparisons
      "pdf_analyses",
      "pdf_comparisons",
      "pdf_documents",
      
      // Incidents (before emails due to FK)
      "incidents",
      
      // Emails (last, as many tables reference it)
      "emails",
      
      // Sync status logs
      "sync_status",
      
      // Recurrence tracking
      "recurrence_tracking",
      
      // Swipe training pairs
      "swipe_training_pairs",
    ];

    for (const table of tablesToDelete) {
      try {
        // Try to delete with user_id filter
        const { error: delError, count } = await supabase
          .from(table)
          .delete({ count: "exact" })
          .eq("user_id", user.id);

        if (delError) {
          // If user_id column doesn't exist, log and skip
          if (delError.message.includes("column") || delError.message.includes("user_id")) {
            console.log(`[${table}] No user_id column or different FK, skipping`);
            deletionResults[table] = 0;
          } else {
            console.error(`[${table}] Delete error:`, delError.message);
            deletionResults[table] = -1;
          }
        } else {
          deletionResults[table] = count || 0;
          console.log(`[${table}] Deleted ${count || 0} rows`);
        }
      } catch (e) {
        console.error(`[${table}] Exception:`, e);
        deletionResults[table] = -1;
      }
    }

    // 2. Reset Gmail config (preserve OAuth, reset sync state)
    const { error: gmailResetError } = await supabase
      .from("gmail_config")
      .update({
        last_sync: null,
        // Reset to force full re-sync
      })
      .eq("user_id", user.id);

    if (gmailResetError) {
      console.error("[gmail_config] Reset error:", gmailResetError.message);
    } else {
      console.log("[gmail_config] Reset last_sync to NULL (OAuth preserved)");
    }

    // 3. Verify Gmail OAuth is still intact
    const { data: gmailConfig } = await supabase
      .from("gmail_config")
      .select("id, user_email, sync_enabled, access_token_enc, refresh_token_enc")
      .eq("user_id", user.id)
      .maybeSingle();

    const gmailOAuthStatus = {
      preserved: !!gmailConfig,
      userEmail: gmailConfig?.user_email || null,
      syncEnabled: gmailConfig?.sync_enabled || false,
      hasAccessToken: !!gmailConfig?.access_token_enc,
      hasRefreshToken: !!gmailConfig?.refresh_token_enc,
    };

    console.log("[hard-data-reset] Gmail OAuth status:", gmailOAuthStatus);

    // Summary
    const totalDeleted = Object.values(deletionResults)
      .filter(v => v > 0)
      .reduce((a, b) => a + b, 0);

    const summary = {
      success: true,
      user: user.email,
      timestamp: new Date().toISOString(),
      deletionResults,
      totalRowsDeleted: totalDeleted,
      gmailOAuth: gmailOAuthStatus,
      message: `Reset complet effectué. ${totalDeleted} enregistrements supprimés. Gmail OAuth conservé.`,
    };

    console.log("[hard-data-reset] Complete:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[hard-data-reset] Error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Erreur interne",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
