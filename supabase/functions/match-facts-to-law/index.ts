import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, log, errorResponse, successResponse } from "../_shared/core.ts";
import { callAI, parseAIJsonResponse } from "../_shared/ai.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { fact_id, fact_type, fact_text, domain, user_id, auto_validate = false } = await req.json();
    if (!fact_text || !user_id) return errorResponse("fact_text and user_id required", "VALIDATION_ERROR", 400, req);

    // Fetch legal articles
    let query = supabase.from("legal_articles").select("*").eq("is_current", true);
    if (domain) query = query.eq("domain", domain);
    const { data: articles } = await query;

    if (!articles?.length) {
      return successResponse({ matches: [], message: "Base légale non déterminée - référentiel vide" }, 200, req);
    }

    // AI matching with guardrails
    const articlesContext = articles.map(a => `- ${a.code_name} art. ${a.article_number}: ${a.article_text?.substring(0, 150)}...`).join("\n");
    
    const response = await callAI([
      { role: "system", content: `Tu es un assistant juridique. RÈGLE: Ne cite QUE les articles du référentiel fourni. Si aucun n'est pertinent, retourne {"matches":[]}.

RÉFÉRENTIEL:\n${articlesContext}` },
      { role: "user", content: `Fait: "${fact_text}"\n\nRetourne JSON: {"matches":[{"code_name":"CODE","article_number":"NUM","relevance_score":0.0-1.0,"mapping_reason":"..."}]}` }
    ], { model: "google/gemini-2.5-flash", maxTokens: 1500 });

    const parsed = parseAIJsonResponse<{ matches: Array<{ code_name: string; article_number: string; relevance_score: number; mapping_reason: string }> }>(response.content);
    const matches = (parsed?.matches || []).filter(m => articles.some(a => a.code_name === m.code_name && a.article_number === m.article_number));

    // Create mappings
    for (const match of matches.filter(m => m.relevance_score >= 0.3)) {
      const article = articles.find(a => a.code_name === match.code_name && a.article_number === match.article_number);
      if (article) {
        await supabase.from("fact_law_mappings").insert({
          fact_id, fact_type, fact_text: fact_text.substring(0, 500),
          legal_article_id: article.id, relevance_score: match.relevance_score,
          mapping_type: match.relevance_score >= 0.7 ? "confirmed" : "potential",
          mapping_reason: match.mapping_reason, ai_generated: true,
          ai_confidence: match.relevance_score, user_id,
          validated_by: auto_validate && match.relevance_score >= 0.8 ? "system" : null,
          validated_at: auto_validate && match.relevance_score >= 0.8 ? new Date().toISOString() : null,
        });
      }
    }

    log("info", "Fact matched", { fact_id, matches: matches.length });
    return successResponse({ matches, mappings_created: matches.filter(m => m.relevance_score >= 0.3).length }, 200, req);
  } catch (error) {
    log("error", "match-facts-to-law error", { error: (error as Error).message });
    return errorResponse((error as Error).message, "INTERNAL_ERROR", 500, req);
  }
});
