import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  corsResponse,
  successResponse,
  errorResponse,
  notFoundResponse,
  createServiceClient,
  parseJsonBody,
  getQueryParam,
  isValidUUID,
  log,
  ErrorCodes,
} from "../_shared/core.ts";

// ============= Types =============
interface SyncStatusResponse {
  id?: string;
  status: string;
  total_emails?: number;
  processed_emails?: number;
  new_emails?: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  stats?: Record<string, unknown>;
  progress?: number;
}

// ============= Main Handler =============
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    const supabase = createServiceClient();

    // Get syncId from query params or body
    let syncId = getQueryParam(req, "syncId");

    if (!syncId) {
      const { data: body } = await parseJsonBody<{ syncId?: string }>(req);
      syncId = body?.syncId || null;
    }

    // If no syncId, return most recent sync status
    if (!syncId) {
      log("debug", "Fetching latest sync status");
      
      const { data, error } = await supabase
        .from("sync_status")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        log("error", "Error fetching latest sync", { error: error.message });
        throw error;
      }

      const response: SyncStatusResponse = data || { status: "none" };
      return successResponse(response);
    }

    // Validate UUID format
    if (!isValidUUID(syncId)) {
      log("warn", "Invalid syncId format", { syncId });
      return notFoundResponse("Invalid sync ID format");
    }

    // Get specific sync status
    log("debug", "Fetching sync status", { syncId });
    
    const { data, error } = await supabase
      .from("sync_status")
      .select("*")
      .eq("id", syncId)
      .single();

    if (error) {
      log("warn", "Sync status not found", { syncId, error: error.message });
      return notFoundResponse("Sync status not found");
    }

    // Calculate progress percentage
    const progress = data.total_emails > 0
      ? Math.round((data.processed_emails / data.total_emails) * 100)
      : 0;

    const response: SyncStatusResponse = {
      ...data,
      progress,
    };

    log("info", "Sync status retrieved", { 
      syncId, 
      status: data.status, 
      progress 
    });

    return successResponse(response);

  } catch (error) {
    log("error", "Sync status error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return errorResponse(
      error instanceof Error ? error.message : "Unknown error",
      ErrorCodes.INTERNAL_ERROR,
      500
    );
  }
});
