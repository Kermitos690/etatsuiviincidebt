import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, log, errorResponse, successResponse } from "../_shared/core.ts";
import { validateAIOutput, createUndeterminedLegalBasisResponse, LegalArticle } from "../_shared/legal-validation.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { ai_output, edge_function_name, user_id, require_legal_basis = true, strict_mode = false, domain } = await req.json();
    if (!ai_output || !user_id) return errorResponse("ai_output and user_id required", "VALIDATION_ERROR", 400, req);

    // Fetch legal repository
    let query = supabase.from("legal_articles").select("*").eq("is_current", true);
    if (domain) query = query.eq("domain", domain);
    const { data: articles } = await query;

    // Validate
    const validation = await validateAIOutput(ai_output, (articles || []) as LegalArticle[], { requireLegalBasis: require_legal_basis, strictMode: strict_mode });

    let validatedOutput = ai_output;
    let status: "valid" | "corrected" | "rejected" = "valid";

    if (validation.hallucinationDetected) {
      status = "corrected";
      for (const ref of validation.rejectedRefs) {
        validatedOutput = validatedOutput.replace(new RegExp(`${ref.code}\\s+(?:art\\.?\\s*)?${ref.article}`, 'gi'), `⚠️ ${ref.code} ${ref.article} [NON VÉRIFIÉ]`);
      }
    }

    if (!validation.isValid && require_legal_basis && validation.verifiedRefs.length === 0) {
      status = "rejected";
      validatedOutput = createUndeterminedLegalBasisResponse("Validation automatique", "Base légale non vérifiable.");
    }

    // Record validation
    await supabase.from("ai_output_validations").insert({
      edge_function_name: edge_function_name || "unknown",
      input_hash: "auto", output_hash: "auto",
      raw_output: { content: ai_output }, validated_output: { content: validatedOutput },
      legal_refs_claimed: [...validation.verifiedRefs, ...validation.rejectedRefs].map(r => `${r.code} ${r.article}`),
      legal_refs_verified: validation.verifiedRefs.map(r => `${r.code} ${r.article}`),
      legal_refs_rejected: validation.rejectedRefs.map(r => `${r.code} ${r.article}`),
      hallucination_detected: validation.hallucinationDetected,
      validation_status: status, validated_at: new Date().toISOString(), user_id,
    });

    log("info", "AI output validated", { status, verified: validation.verifiedRefs.length, rejected: validation.rejectedRefs.length });
    return successResponse({ is_valid: validation.isValid, validation_status: status, verified_references: validation.verifiedRefs, validated_output: validatedOutput }, 200, req);
  } catch (error) {
    log("error", "validate-ai-output error", { error: (error as Error).message });
    return errorResponse((error as Error).message, "INTERNAL_ERROR", 500, req);
  }
});
