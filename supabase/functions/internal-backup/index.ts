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
      // Fallback sur l'authentification utilisateur standard
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

    // Utiliser le service role pour le backup
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { format = "json", tables = ["incidents", "emails"] } = await req.json().catch(() => ({}));

    const backupData: Record<string, unknown[]> = {};
    const errors: string[] = [];

    for (const table of tables) {
      const allowedTables = ["incidents", "emails", "email_attachments", "thread_analyses", "actor_trust_scores", "gmail_config"];
      if (!allowedTables.includes(table)) {
        errors.push(`Table '${table}' non autorisée`);
        continue;
      }

      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        errors.push(`Erreur ${table}: ${error.message}`);
      } else {
        backupData[table] = data || [];
      }
    }

    const timestamp = new Date().toISOString();
    const backupMeta = {
      timestamp,
      tables: Object.keys(backupData),
      recordCounts: Object.fromEntries(
        Object.entries(backupData).map(([k, v]) => [k, v.length])
      ),
      format,
      errors: errors.length > 0 ? errors : undefined,
    };

    // Log du backup
    console.log(`[BACKUP] ${timestamp} - Tables: ${Object.keys(backupData).join(", ")} - Records: ${JSON.stringify(backupMeta.recordCounts)}`);

    if (format === "csv") {
      const csvParts: string[] = [];
      for (const [tableName, records] of Object.entries(backupData)) {
        if (records.length === 0) continue;
        const headers = Object.keys(records[0] as object);
        const rows = records.map((r) =>
          headers.map((h) => {
            const val = (r as Record<string, unknown>)[h];
            if (val === null || val === undefined) return "";
            if (typeof val === "object") return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
            return `"${String(val).replace(/"/g, '""')}"`;
          }).join(",")
        );
        csvParts.push(`# ${tableName}\n${headers.join(",")}\n${rows.join("\n")}`);
      }
      return new Response(csvParts.join("\n\n"), {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="backup-${timestamp}.csv"`,
        },
      });
    }

    return new Response(JSON.stringify({ ...backupMeta, data: backupData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[BACKUP ERROR]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
