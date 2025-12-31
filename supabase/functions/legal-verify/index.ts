import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// TYPES
// ============================================================

type LegalVerifyMode = "legal" | "procedure" | "roles" | "deadlines" | "definitions" | "jurisprudence";

interface LegalCitation {
  title: string;
  url: string;
}

interface LegalVerifyRequest {
  query: string;
  context?: {
    incident_title?: string;
    category?: string;
    event_date?: string;
    facts_summary?: string;
    jurisdiction?: string;
    institutions?: string[];
    topics?: string[];
  };
  mode?: LegalVerifyMode;
  max_citations?: number;
  force_external?: boolean;
}

interface LegalVerifyResponse {
  summary: string;
  key_points: string[];
  citations: LegalCitation[];
  confidence: number;
  warnings?: string[];
  source: "local" | "external" | "hybrid" | "degraded";
  cost_saved: boolean;
}

interface LocalLegalMatch {
  code_name: string;
  article_number: string;
  article_title?: string;
  article_text: string;
  domain?: string;
  keywords?: string[];
  relevance: number;
}

interface GatekeeperDecision {
  needsExternal: boolean;
  reason: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OFFICIAL_DOMAIN_TITLES: Record<string, string> = {
  "fedlex.admin.ch": "Fedlex - Droit fédéral",
  "admin.ch": "Confédération suisse",
  "edoeb.admin.ch": "Préposé fédéral (PFPDT)",
  "bger.ch": "Tribunal fédéral",
  "vd.ch": "Canton de Vaud",
  "ch.ch": "Portail suisse",
  "bfs.admin.ch": "Office fédéral de la statistique",
  "seco.admin.ch": "Secrétariat d'État à l'économie",
  "bsv.admin.ch": "Office fédéral des assurances sociales",
  "ejpd.admin.ch": "Département fédéral de justice et police",
};

const PRIORITY_DOMAINS = [
  "fedlex.admin.ch",
  "admin.ch",
  "edoeb.admin.ch",
  "bger.ch",
  "vd.ch",
];

const EXTERNAL_REQUIRED_KEYWORDS = [
  "jurisprudence", "atf", "arrêt", "tribunal fédéral",
  "décision", "jugement", "recours accepté", "recours rejeté",
  "délai exact", "combien de jours", "quel délai",
];

const LOCAL_SUFFICIENT_KEYWORDS = [
  "principe", "définition", "rôle", "compétence",
  "curateur", "curatelle", "protection adulte",
  "lpd", "données personnelles", "droit d'accès",
];

const LOCAL_ONLY_BASE_URLS: Record<string, string> = {
  "LPD": "https://www.fedlex.admin.ch/eli/cc/2022/491/fr",
  "CC": "https://www.fedlex.admin.ch/eli/cc/24/233_245_233/fr",
  "LPGA": "https://www.fedlex.admin.ch/eli/cc/2002/510/fr",
  "LAI": "https://www.fedlex.admin.ch/eli/cc/1959/827_857_845/fr",
};

const DEGRADED_RESPONSE: LegalVerifyResponse = {
  summary: "Cadre légal non vérifié – service externe indisponible",
  key_points: [],
  citations: [],
  confidence: 0.0,
  warnings: ["perplexity_unavailable"],
  source: "degraded",
  cost_saved: false,
};

const CACHE_TTL_DAYS = 7;

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function hashQuery(query: string): string {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, " ");
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `lv_${Math.abs(hash).toString(16)}`;
}

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^\wàâäéèêëïîôùûüç\s-]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3);
  return [...new Set(words)].slice(0, 20);
}

function calculateRelevance(text: string, query: string, keywords?: string[]): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  let score = 0;

  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  for (const word of queryWords) {
    if (textLower.includes(word)) score += 0.15;
  }

  if (keywords) {
    for (const kw of keywords) {
      if (queryLower.includes(kw.toLowerCase())) score += 0.2;
    }
  }

  return Math.min(1, score);
}

function extractTitleFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    for (const [domain, title] of Object.entries(OFFICIAL_DOMAIN_TITLES)) {
      if (hostname === domain || hostname.endsWith("." + domain)) {
        return title;
      }
    }
    return hostname;
  } catch {
    return "Source externe";
  }
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// ============================================================
// CACHE FUNCTIONS
// ============================================================

async function checkCache(
  supabase: any,
  queryHash: string
): Promise<LegalVerifyResponse | null> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CACHE_TTL_DAYS);

    const { data, error } = await supabase
      .from("legal_search_results")
      .select("*")
      .eq("search_query", queryHash)
      .gte("created_at", cutoffDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    const row = data as any;
    const summary = typeof row.summary === "string" ? row.summary : (typeof row.title === "string" ? row.title : "");
    const keywords = Array.isArray(row.keywords) ? row.keywords : [];
    const sourceUrl = typeof row.source_url === "string" ? row.source_url : "";
    const sourceName = typeof row.source_name === "string" ? row.source_name : "";
    const relevanceScore = typeof row.relevance_score === "number" ? row.relevance_score : 50;

    return {
      summary,
      key_points: keywords.map((k: unknown) => String(k)),
      citations: sourceUrl ? [{ title: sourceName || extractTitleFromUrl(sourceUrl), url: sourceUrl }] : [],
      confidence: clampConfidence(relevanceScore / 100),
      warnings: ["cache_hit"],
      source: "local",
      cost_saved: true,
    };
  } catch (e) {
    console.error("Cache check error:", e);
    return null;
  }
}

async function saveToCache(
  supabase: any,
  queryHash: string,
  result: LegalVerifyResponse,
  userId?: string
): Promise<void> {
  try {
    await supabase.from("legal_search_results").insert({
      search_query: queryHash,
      title: result.summary.slice(0, 255),
      summary: result.summary,
      keywords: result.key_points.slice(0, 10),
      source_url: result.citations[0]?.url || "",
      source_name: result.citations[0]?.title || "",
      source_type: result.source,
      relevance_score: Math.round(result.confidence * 100),
      is_saved: true,
      user_id: userId,
    });
  } catch (e) {
    console.error("Cache save error:", e);
  }
}

// ============================================================
// LOCAL DATABASE QUERIES
// ============================================================

async function queryLocalLegalArticles(
  supabase: any,
  query: string,
  topics?: string[]
): Promise<LocalLegalMatch[]> {
  try {
    const { data, error } = await supabase
      .from("legal_articles")
      .select("code_name, article_number, article_title, article_text, domain, keywords")
      .eq("is_current", true)
      .limit(20);

    if (error || !data) return [];

    const matches: LocalLegalMatch[] = (data as Array<{
      code_name: string;
      article_number: string;
      article_title?: string;
      article_text: string;
      domain?: string;
      keywords?: string[];
    }>).map((article) => ({
      code_name: article.code_name,
      article_number: article.article_number,
      article_title: article.article_title,
      article_text: article.article_text,
      domain: article.domain,
      keywords: article.keywords,
      relevance: calculateRelevance(
        `${article.article_title || ""} ${article.article_text}`,
        query,
        article.keywords
      ),
    }));

    return matches
      .filter(m => m.relevance > 0.1)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);
  } catch (e) {
    console.error("Local articles query error:", e);
    return [];
  }
}

async function queryLocalLegalReferences(
  supabase: any,
  query: string
): Promise<LocalLegalMatch[]> {
  try {
    const { data, error } = await supabase
      .from("legal_references")
      .select("code_name, article_number, article_text, domain, keywords")
      .limit(15);

    if (error || !data) return [];

    const matches: LocalLegalMatch[] = (data as Array<{
      code_name: string;
      article_number: string;
      article_text?: string;
      domain?: string;
      keywords?: string[];
    }>).map((ref) => ({
      code_name: ref.code_name,
      article_number: ref.article_number,
      article_text: ref.article_text || "",
      domain: ref.domain,
      keywords: ref.keywords,
      relevance: calculateRelevance(
        `${ref.code_name} ${ref.article_number} ${ref.article_text || ""}`,
        query,
        ref.keywords
      ),
    }));

    return matches
      .filter(m => m.relevance > 0.1)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 3);
  } catch (e) {
    console.error("Local references query error:", e);
    return [];
  }
}

// ============================================================
// GATEKEEPER
// ============================================================

function shouldCallPerplexity(
  request: LegalVerifyRequest,
  localMatches: LocalLegalMatch[]
): GatekeeperDecision {
  const queryLower = request.query.toLowerCase();
  const mode = request.mode || "legal";

  if (request.force_external) {
    return { needsExternal: true, reason: "force_external_requested" };
  }

  if (mode === "jurisprudence") {
    return { needsExternal: true, reason: "jurisprudence_mode" };
  }

  for (const kw of EXTERNAL_REQUIRED_KEYWORDS) {
    if (queryLower.includes(kw)) {
      return { needsExternal: true, reason: `keyword_${kw.replace(/\s+/g, "_")}` };
    }
  }

  if (mode === "deadlines") {
    const precisionPatterns = ["exact", "précis", "combien", "jours", "quel délai"];
    for (const pattern of precisionPatterns) {
      if (queryLower.includes(pattern)) {
        return { needsExternal: true, reason: "deadline_precision_required" };
      }
    }
  }

  const highQualityMatches = localMatches.filter(m => m.relevance >= 0.5);

  if (highQualityMatches.length >= 2) {
    return { needsExternal: false, reason: "sufficient_local_matches" };
  }

  if ((mode === "roles" || mode === "definitions") && localMatches.length >= 1) {
    return { needsExternal: false, reason: "local_sufficient_for_mode" };
  }

  if (localMatches.length >= 1) {
    return { needsExternal: false, reason: "local_match_available" };
  }

  return { needsExternal: true, reason: "no_local_matches" };
}

// ============================================================
// LOCAL RESPONSE BUILDER
// ============================================================

function buildLocalResponse(
  localMatches: LocalLegalMatch[],
  gatekeeperReason: string
): LegalVerifyResponse {
  if (localMatches.length === 0) {
    return {
      ...DEGRADED_RESPONSE,
      warnings: ["no_local_matches"],
      source: "local",
      cost_saved: true,
    };
  }

  const articlesList = localMatches
    .map(m => `${m.code_name} art. ${m.article_number}`)
    .join(", ");

  const summary = `Cadre juridique basé sur le référentiel interne. Articles pertinents : ${articlesList}.`;

  const keyPoints = localMatches.map(m => {
    const text = m.article_text || m.article_title || "";
    return text.length > 150 ? text.slice(0, 147) + "..." : text;
  }).filter(Boolean);

  const citations: LegalCitation[] = localMatches.map(m => {
    const baseUrl = LOCAL_ONLY_BASE_URLS[m.code_name] || "https://www.fedlex.admin.ch";
    return {
      title: `${m.code_name} art. ${m.article_number} (référentiel interne)`,
      url: baseUrl,
    };
  });

  const avgRelevance = localMatches.reduce((sum, m) => sum + m.relevance, 0) / localMatches.length;
  const confidence = clampConfidence(Math.min(0.75, avgRelevance + 0.3));

  return {
    summary,
    key_points: keyPoints,
    citations: citations.slice(0, 5),
    confidence,
    warnings: [`gatekeeper:${gatekeeperReason}`],
    source: "local",
    cost_saved: true,
  };
}

// ============================================================
// PERPLEXITY API
// ============================================================

function buildSystemPrompt(request: LegalVerifyRequest): string {
  const mode = request.mode || "legal";
  const context = request.context || {};

  let prompt = `Tu es un expert juridique suisse spécialisé en droit de la protection de l'adulte.
Juridiction: ${context.jurisdiction || "Suisse (CH-VD)"}.
Mode d'analyse: ${mode}.

`;

  if (context.incident_title) {
    prompt += `Contexte - Titre: ${context.incident_title}\n`;
  }
  if (context.event_date) {
    prompt += `Date de l'événement: ${context.event_date}\n`;
  }
  if (context.facts_summary) {
    prompt += `Résumé factuel: ${context.facts_summary}\n`;
  }

  prompt += `
RÈGLES STRICTES:
1. Réponds UNIQUEMENT en français
2. Ne JAMAIS affirmer sans source officielle vérifiable
3. Maximum 5 citations de sources officielles
4. Privilégier: fedlex.admin.ch, admin.ch, bger.ch, vd.ch

RÉPONSE OBLIGATOIRE en JSON strict:
{
  "summary": "résumé clair et neutre (max 300 mots)",
  "key_points": ["point clé 1", "point clé 2", "..."],
  "citations": [{"title": "titre source", "url": "url officielle"}],
  "confidence": 0.0 à 1.0
}

Confidence:
- 0.9-1.0: sources officielles multiples concordantes
- 0.7-0.9: sources officielles partielles
- 0.5-0.7: sources mixtes
- 0.0-0.5: sources insuffisantes
`;

  return prompt;
}

async function callPerplexity(
  apiKey: string,
  query: string,
  systemPrompt: string,
  maxCitations: number
): Promise<LegalVerifyResponse> {
  const startTime = Date.now();

  try {
    let response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        max_tokens: 2000,
        return_citations: true,
        search_domain_filter: PRIORITY_DOMAINS,
      }),
    });

    let data = await response.json();
    let usedFallback = false;

    if (!data.citations || data.citations.length === 0) {
      response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: query },
          ],
          max_tokens: 2000,
          return_citations: true,
        }),
      });
      data = await response.json();
      usedFallback = true;
    }

    if (!response.ok) {
      console.error("Perplexity API error:", response.status);
      return DEGRADED_RESPONSE;
    }

    const content = data.choices?.[0]?.message?.content || "";
    const perplexityCitations: string[] = data.citations || [];
    const warnings: string[] = [];

    if (usedFallback) {
      warnings.push("official_filter_no_results");
    }

    let parsed: { summary?: string; key_points?: string[]; citations?: LegalCitation[]; confidence?: number } | null = null;

    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*?\}(?=\s*$)/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
          warnings.push("json_parse_fallback");
        } catch {
          warnings.push("json_parse_error");
        }
      } else {
        warnings.push("json_parse_error");
      }
    }

    const citations: LegalCitation[] = [];
    
    if (parsed?.citations && Array.isArray(parsed.citations)) {
      for (const c of parsed.citations) {
        if (typeof c === "object" && c.url) {
          citations.push({
            title: c.title || extractTitleFromUrl(c.url),
            url: c.url,
          });
        }
      }
    }

    for (const url of perplexityCitations) {
      if (typeof url === "string" && !citations.find(c => c.url === url)) {
        citations.push({
          title: extractTitleFromUrl(url),
          url,
        });
      }
    }

    const officialCitations = citations.filter(c => {
      try {
        const hostname = new URL(c.url).hostname;
        return PRIORITY_DOMAINS.some(d => hostname === d || hostname.endsWith("." + d));
      } catch {
        return false;
      }
    });

    if (citations.length === 0) {
      warnings.push("no_citations");
    } else if (officialCitations.length === 0) {
      warnings.push("no_official_sources");
    } else if (officialCitations.length < citations.length / 2) {
      warnings.push("partial_sources");
    }

    const latency = Date.now() - startTime;
    console.log(`Perplexity call: ${latency}ms, citations: ${citations.length}`);

    return {
      summary: parsed?.summary || content.slice(0, 500),
      key_points: parsed?.key_points || [],
      citations: citations.slice(0, maxCitations),
      confidence: clampConfidence(parsed?.confidence || (citations.length > 0 ? 0.7 : 0.4)),
      warnings: warnings.length > 0 ? warnings : undefined,
      source: "external",
      cost_saved: false,
    };
  } catch (e) {
    console.error("Perplexity call error:", e);
    return DEGRADED_RESPONSE;
  }
}

// ============================================================
// HYBRID MERGE
// ============================================================

function mergeHybridResponse(
  externalResponse: LegalVerifyResponse,
  localMatches: LocalLegalMatch[],
  maxCitations: number
): LegalVerifyResponse {
  if (localMatches.length === 0 || externalResponse.source === "degraded") {
    return externalResponse;
  }

  const existingUrls = new Set(externalResponse.citations.map(c => c.url));
  const localCitations: LegalCitation[] = [];

  for (const match of localMatches.slice(0, 2)) {
    const baseUrl = LOCAL_ONLY_BASE_URLS[match.code_name];
    if (baseUrl && !existingUrls.has(baseUrl)) {
      localCitations.push({
        title: `${match.code_name} art. ${match.article_number} (référentiel)`,
        url: baseUrl,
      });
    }
  }

  const mergedCitations = [...externalResponse.citations, ...localCitations].slice(0, maxCitations);

  return {
    ...externalResponse,
    citations: mergedCitations,
    source: "hybrid",
    warnings: [...(externalResponse.warnings || []), "hybrid_local_merge"],
  };
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const request: LegalVerifyRequest = {
      query: body.query || "",
      context: body.context,
      mode: body.mode || "legal",
      max_citations: body.max_citations || 5,
      force_external: body.force_external || false,
    };

    if (!request.query || request.query.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Query must be at least 10 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify(DEGRADED_RESPONSE),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const queryHash = hashQuery(request.query);

    if (!request.force_external) {
      const cachedResult = await checkCache(supabase, queryHash);
      if (cachedResult) {
        const latency = Date.now() - startTime;
        console.log(`Cache hit: ${latency}ms, confidence: ${cachedResult.confidence}`);
        return new Response(
          JSON.stringify(cachedResult),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const localArticles = await queryLocalLegalArticles(supabase, request.query, request.context?.topics);
    const localRefs = await queryLocalLegalReferences(supabase, request.query);
    const localMatches = [...localArticles, ...localRefs].sort((a, b) => b.relevance - a.relevance);

    const decision = shouldCallPerplexity(request, localMatches);

    if (!decision.needsExternal) {
      const localResponse = buildLocalResponse(localMatches, decision.reason);
      const latency = Date.now() - startTime;
      console.log(`Local response: ${latency}ms, source: local, confidence: ${localResponse.confidence}`);
      
      await saveToCache(supabase, queryHash, localResponse);
      
      return new Response(
        JSON.stringify(localResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");

    if (!perplexityKey) {
      if (localMatches.length > 0) {
        const fallbackResponse = buildLocalResponse(localMatches, "perplexity_unavailable");
        fallbackResponse.warnings = [...(fallbackResponse.warnings || []), "perplexity_unavailable", "fallback_to_local"];
        
        const latency = Date.now() - startTime;
        console.log(`Fallback local: ${latency}ms, reason: no_api_key`);
        
        return new Response(
          JSON.stringify(fallbackResponse),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify(DEGRADED_RESPONSE),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = buildSystemPrompt(request);
    let externalResponse = await callPerplexity(
      perplexityKey,
      request.query,
      systemPrompt,
      request.max_citations || 5
    );

    if (localMatches.length > 0 && externalResponse.source !== "degraded") {
      externalResponse = mergeHybridResponse(externalResponse, localMatches, request.max_citations || 5);
    }

    await saveToCache(supabase, queryHash, externalResponse);

    const latency = Date.now() - startTime;
    console.log(`External response: ${latency}ms, source: ${externalResponse.source}, confidence: ${externalResponse.confidence}`);

    return new Response(
      JSON.stringify(externalResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Legal verify error:", e);
    return new Response(
      JSON.stringify(DEGRADED_RESPONSE),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
