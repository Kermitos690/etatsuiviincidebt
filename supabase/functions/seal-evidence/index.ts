import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, log, errorResponse, successResponse } from "../_shared/core.ts";
import { createProofChainData } from "../_shared/legal-validation.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { entity_type, entity_id, content, seal_reason = "creation", user_id } = body;

    // Fetch content if not provided
    let entityContent = content;
    if (!entityContent) {
      const tableMap: Record<string, string> = {
        email: "emails", incident: "incidents", attachment: "email_attachments",
        legal_mapping: "fact_law_mappings", compliance: "compliance_assessments"
      };
      const { data } = await supabase.from(tableMap[entity_type] || "emails").select("*").eq("id", entity_id).single();
      entityContent = data;
    }

    if (!entityContent) {
      return errorResponse(`Entity not found: ${entity_type}/${entity_id}`, 404, req);
    }

    // Get previous proof
    const { data: previousProofs } = await supabase
      .from("proof_chain")
      .select("id, chain_position")
      .eq("entity_type", entity_type)
      .eq("entity_id", entity_id)
      .order("chain_position", { ascending: false })
      .limit(1);

    const previousProof = previousProofs?.[0];
    const chainPosition = (previousProof?.chain_position || 0) + 1;

    const proofData = await createProofChainData(entity_type, entity_id, entityContent, { sealed_at: new Date().toISOString() });

    const { data: newProof, error: insertError } = await supabase
      .from("proof_chain")
      .insert({
        entity_type, entity_id,
        content_hash: proofData.content_hash,
        metadata_hash: proofData.metadata_hash,
        combined_hash: proofData.combined_hash,
        previous_proof_id: previousProof?.id || null,
        chain_position: chainPosition,
        sealed_by: "edge_function",
        seal_reason,
        verification_status: "valid",
        last_verified_at: new Date().toISOString(),
        user_id,
      })
      .select("id")
      .single();

    if (insertError) throw new Error(insertError.message);

    log("info", "Entity sealed", { entity_type, entity_id, proof_id: newProof?.id });

    return successResponse({ entity_id, proof_id: newProof?.id, combined_hash: proofData.combined_hash }, 200, req);
  } catch (error) {
    log("error", "seal-evidence error", { error: (error as Error).message });
    return errorResponse((error as Error).message, 500, req);
  }
});
