import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get syncId from query params or body
    let syncId: string | null = null;
    
    const url = new URL(req.url);
    syncId = url.searchParams.get("syncId");
    
    if (!syncId) {
      try {
        const body = await req.json();
        syncId = body.syncId;
      } catch {
        // No body
      }
    }

    if (!syncId) {
      // Return the most recent sync status
      const { data, error } = await supabase
        .from("sync_status")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return new Response(JSON.stringify(data || { status: "none" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get specific sync status
    const { data, error } = await supabase
      .from("sync_status")
      .select("*")
      .eq("id", syncId)
      .single();

    if (error) {
      console.error("Error fetching sync status:", error);
      return new Response(JSON.stringify({ 
        error: "Sync status not found",
        status: "error"
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const progress = data.total_emails > 0 
      ? Math.round((data.processed_emails / data.total_emails) * 100) 
      : 0;

    return new Response(JSON.stringify({
      ...data,
      progress
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Sync status error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message, status: "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
