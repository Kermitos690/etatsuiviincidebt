import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// TYPES
// ============================================================

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
  mode?: 'legal' | 'procedure' | 'roles' | 'deadlines' | 'definitions' | 'jurisprudence';
  max_citations?: number;
  force_external?: boolean; // Force Perplexity call (for explicit user request)
}

interface LegalCitation {
  title: string;
  url: string;
}

interface LegalVerifyResponse {
  summary: string;
  key_points: string[];
  citations: LegalCitation[];
  confidence: number;
  warnings?: string[];
  source: 'local' | 'external' | 'hybrid' | 'degraded';
  cost_saved?: boolean;
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

// ============================================================
// CONSTANTS
// ============================================================

const DEGRADED_RESPONSE: LegalVerifyResponse = {
  summary: "Cadre légal non vérifié – service externe indisponible",
  key_points: [],
  citations: [],
  confidence: 0.0,
  warnings: ['perplexity_unavailable'],
  source: 'degraded'
};

const LOCAL_ONLY_RESPONSE: LegalVerifyResponse = {
  summary: "Cadre juridique basé sur référentiel interne",
  key_points: [],
  citations: [],
  confidence: 0.0,
  warnings: [],
  source: 'local',
  cost_saved: true
};

// Domain mappings
const OFFICIAL_DOMAINS: Record<string, string> = {
  'fedlex.admin.ch': 'Fedlex - Droit fédéral',
  'admin.ch': 'Confédération suisse',
  'edoeb.admin.ch': 'Préposé fédéral (PFPDT)',
  'bger.ch': 'Tribunal fédéral',
  'vd.ch': 'Canton de Vaud',
  'ch.ch': 'Portail suisse',
  'bfs.admin.ch': 'Office fédéral de la statistique',
  'seco.admin.ch': 'SECO',
  'bsv.admin.ch': 'Office fédéral des assurances sociales',
  'ejpd.admin.ch': 'Département fédéral de justice',
};

const PRIORITY_DOMAINS = [
  'fedlex.admin.ch', 'admin.ch', 'edoeb.admin.ch',
  'bger.ch', 'vd.ch', 'ch.ch'
];

// Keywords that REQUIRE external verification (jurisprudence, specific articles, etc.)
const EXTERNAL_REQUIRED_KEYWORDS = [
  'atf', 'arrêt', 'jurisprudence', 'tribunal fédéral',
  'considérant', 'décision', 'jugement',
  'art.', 'article précis', 'référence exacte',
  'contesté', 'litige', 'conflit',
  'quel délai exact', 'combien de jours'
];

// Keywords that can be answered locally (stable, known)
const LOCAL_SUFFICIENT_KEYWORDS = [
  'principe', 'principes généraux', 'rôle', 'compétences',
  'définition', 'qu\'est-ce que', 'en général',
  'curateur', 'curatelle', 'protection adulte',
  'lpd', 'traçabilité', 'obligation générale'
];

// ============================================================
// GATEKEEPER LOGIC
// ============================================================

/**
 * Determines if Perplexity call is necessary or if local DB is sufficient
 * Returns: { needsExternal: boolean, reason: string }
 */
function shouldCallPerplexity(
  request: LegalVerifyRequest,
  localMatches: LocalLegalMatch[]
): { needsExternal: boolean; reason: string } {
  const query = request.query.toLowerCase();
  const mode = request.mode || 'legal';

  // 1. Force external if explicitly requested
  if (request.force_external) {
    return { needsExternal: true, reason: 'user_explicit_request' };
  }

  // 2. Jurisprudence mode ALWAYS requires external
  if (mode === 'jurisprudence') {
    return { needsExternal: true, reason: 'jurisprudence_mode' };
  }

  // 3. Check for keywords requiring external verification
  const hasExternalKeyword = EXTERNAL_REQUIRED_KEYWORDS.some(kw => query.includes(kw));
  if (hasExternalKeyword) {
    return { needsExternal: true, reason: 'requires_exact_citation' };
  }

  // 4. Check if specific deadline with uncertainty
  if (mode === 'deadlines' && /combien|exact|précis|quel délai/i.test(query)) {
    return { needsExternal: true, reason: 'uncertain_deadline' };
  }

  // 5. If we have good local matches (>= 2 relevant articles), prefer local
  const goodLocalMatches = localMatches.filter(m => m.relevance >= 0.5);
  if (goodLocalMatches.length >= 2) {
    return { needsExternal: false, reason: 'sufficient_local_coverage' };
  }

  // 6. Check for local-sufficient keywords
  const hasLocalKeyword = LOCAL_SUFFICIENT_KEYWORDS.some(kw => query.includes(kw));
  if (hasLocalKeyword && localMatches.length >= 1) {
    return { needsExternal: false, reason: 'stable_knowledge_local' };
  }

  // 7. Roles and definitions can often be answered locally
  if ((mode === 'roles' || mode === 'definitions') && localMatches.length >= 1) {
    return { needsExternal: false, reason: 'standard_reference_local' };
  }

  // 8. Default: if we have some local matches, don't call external
  if (localMatches.length >= 1) {
    return { needsExternal: false, reason: 'local_matches_available' };
  }

  // 9. No local matches and not explicitly blocked -> allow external
  return { needsExternal: true, reason: 'no_local_coverage' };
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
    const keywords = extractKeywords(query);
    
    const { data: articles, error } = await supabase
      .from('legal_articles')
      .select('code_name, article_number, article_title, article_text, domain, keywords')
      .eq('is_current', true)
      .limit(20);

    if (error || !articles) {
      console.log('[legal-verify] Local articles query failed:', error?.message);
      return [];
    }

    const scored: LocalLegalMatch[] = (articles as any[]).map(article => {
      const relevance = calculateRelevance(query, keywords, article);
      return {
        code_name: String(article.code_name || ''),
        article_number: String(article.article_number || ''),
        article_title: article.article_title ? String(article.article_title) : undefined,
        article_text: String(article.article_text || ''),
        domain: article.domain ? String(article.domain) : undefined,
        keywords: Array.isArray(article.keywords) ? article.keywords : undefined,
        relevance
      };
    }).filter(m => m.relevance > 0.2);

    scored.sort((a, b) => b.relevance - a.relevance);
    return scored.slice(0, 5);
  } catch (err) {
    console.error('[legal-verify] Error querying local articles:', err);
    return [];
  }
}

async function queryLocalLegalReferences(
  supabase: any,
  query: string
): Promise<LocalLegalMatch[]> {
  try {
    const keywords = extractKeywords(query);

    const { data: refs, error } = await supabase
      .from('legal_references')
      .select('code_name, article_number, article_text, domain, keywords')
      .eq('is_verified', true)
      .limit(10);

    if (error || !refs) return [];

    const scored: LocalLegalMatch[] = (refs as any[]).map(ref => {
      const relevance = calculateRelevance(query, keywords, ref);
      return {
        code_name: String(ref.code_name || ''),
        article_number: String(ref.article_number || ''),
        article_text: String(ref.article_text || ''),
        domain: ref.domain ? String(ref.domain) : undefined,
        keywords: Array.isArray(ref.keywords) ? ref.keywords : undefined,
        relevance
      };
    }).filter(m => m.relevance > 0.2);

    scored.sort((a, b) => b.relevance - a.relevance);
    return scored.slice(0, 3);
  } catch {
    return [];
  }
}

async function checkCache(
  supabase: any,
  queryHash: string
): Promise<LegalVerifyResponse | null> {
  try {
    const { data, error } = await supabase
      .from('legal_search_results')
      .select('*')
      .eq('search_query', queryHash)
      .eq('is_saved', true)
      .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      summary: String(data.summary || data.title || ''),
      key_points: Array.isArray(data.keywords) ? data.keywords : [],
      citations: data.source_url ? [{ title: String(data.source_name || ''), url: String(data.source_url) }] : [],
      confidence: (typeof data.relevance_score === 'number' ? data.relevance_score : 50) / 100,
      source: 'local',
      cost_saved: true
    };
  } catch {
    return null;
  }
}

async function saveToCache(
  supabase: any,
  queryHash: string,
  result: LegalVerifyResponse
): Promise<void> {
  try {
    await supabase.from('legal_search_results').insert({
      search_query: queryHash,
      title: result.summary.substring(0, 200),
      summary: result.summary,
      source_name: result.source,
      source_type: 'perplexity',
      source_url: result.citations[0]?.url || '',
      keywords: result.key_points,
      relevance_score: Math.round(result.confidence * 100),
      is_saved: true
    });
  } catch (err) {
    console.log('[legal-verify] Cache save failed:', err);
  }
}

// ============================================================
// CACHE FUNCTIONS
// ============================================================

async function checkCache(
  supabase: ReturnType<typeof createClient>,
  queryHash: string
): Promise<LegalVerifyResponse | null> {
  try {
    const { data, error } = await supabase
      .from('legal_search_results')
      .select('*')
      .eq('search_query', queryHash)
      .eq('is_saved', true)
      .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // 7 days cache
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      summary: data.summary || data.title,
      key_points: data.keywords || [],
      citations: data.source_url ? [{ title: data.source_name, url: data.source_url }] : [],
      confidence: (data.relevance_score || 50) / 100,
      source: 'local',
      cost_saved: true
    };
  } catch {
    return null;
  }
}

async function saveToCache(
  supabase: ReturnType<typeof createClient>,
  queryHash: string,
  result: LegalVerifyResponse
): Promise<void> {
  try {
    await supabase.from('legal_search_results').insert({
      search_query: queryHash,
      title: result.summary.substring(0, 200),
      summary: result.summary,
      source_name: result.source,
      source_type: 'perplexity',
      source_url: result.citations[0]?.url || '',
      keywords: result.key_points,
      relevance_score: Math.round(result.confidence * 100),
      is_saved: true
    });
  } catch (err) {
    console.log('[legal-verify] Cache save failed:', err);
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function extractKeywords(text: string): string[] {
  const normalized = text.toLowerCase()
    .replace(/[^\wàâäéèêëïîôùûüç\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3);

  const stopwords = ['pour', 'dans', 'avec', 'cette', 'sont', 'plus', 'comme', 'leur', 'être', 'faire'];
  return [...new Set(normalized.filter(w => !stopwords.includes(w)))];
}

function calculateRelevance(query: string, queryKeywords: string[], article: any): number {
  const articleText = `${article.article_title || ''} ${article.article_text} ${article.code_name}`.toLowerCase();
  const articleKeywords: string[] = article.keywords || [];

  let score = 0;

  // Keyword matches
  for (const kw of queryKeywords) {
    if (articleText.includes(kw)) score += 0.15;
    if (articleKeywords.some((ak: string) => ak.toLowerCase().includes(kw))) score += 0.25;
  }

  // Domain relevance
  if (query.includes('lpd') && article.domain === 'LPD') score += 0.3;
  if (query.includes('curatelle') && article.code_name?.includes('CC')) score += 0.3;
  if (query.includes('délai') && article.article_text?.includes('délai')) score += 0.2;

  return Math.min(1, score);
}

function hashQuery(query: string): string {
  // Simple hash for cache key
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `lv_${Math.abs(hash).toString(36)}`;
}

function buildLocalResponse(
  matches: LocalLegalMatch[],
  request: LegalVerifyRequest
): LegalVerifyResponse {
  if (matches.length === 0) {
    return {
      ...LOCAL_ONLY_RESPONSE,
      summary: "Aucune correspondance trouvée dans le référentiel interne.",
      confidence: 0.2,
      warnings: ['no_local_matches']
    };
  }

  const topMatches = matches.slice(0, 3);
  const summary = `Cadre juridique basé sur le référentiel interne:\n\n${
    topMatches.map(m => `• ${m.code_name} ${m.article_number}${m.article_title ? ` - ${m.article_title}` : ''}`).join('\n')
  }`;

  const keyPoints = topMatches.map(m => {
    const preview = m.article_text.substring(0, 150);
    return `${m.code_name} ${m.article_number}: ${preview}${m.article_text.length > 150 ? '...' : ''}`;
  });

  // Build internal citations (no external URLs)
  const citations: LegalCitation[] = topMatches.map(m => ({
    title: `${m.code_name} ${m.article_number}`,
    url: m.domain === 'LPD' 
      ? 'https://fedlex.admin.ch/eli/cc/2022/491/fr' 
      : m.code_name?.includes('CC') 
        ? 'https://fedlex.admin.ch/eli/cc/24/233_245_233/fr'
        : 'https://fedlex.admin.ch'
  }));

  const avgRelevance = topMatches.reduce((sum, m) => sum + m.relevance, 0) / topMatches.length;

  return {
    summary,
    key_points: keyPoints,
    citations,
    confidence: Math.min(0.75, avgRelevance + 0.3), // Max 0.75 for local-only
    source: 'local',
    cost_saved: true
  };
}

// ============================================================
// PERPLEXITY FUNCTIONS
// ============================================================

function buildSystemPrompt(mode: string, context: LegalVerifyRequest['context']): string {
  const jurisdiction = context?.jurisdiction || 'CH-VD';
  const institutions = context?.institutions?.join(', ') || 'institutions suisses';
  const topics = context?.topics?.join(', ') || 'droit administratif suisse';

  const modeInstructions: Record<string, string> = {
    legal: `Recherche les bases légales suisses applicables (Code civil, LPD, LPGA, LAI, droit cantonal vaudois). 
            Cite uniquement des articles de loi officiels avec leurs références exactes.`,
    procedure: `Décris les procédures administratives officielles en Suisse (${jurisdiction}). 
               Focus sur les étapes, délais documentés, et obligations des parties. Ne jamais inventer de délai sans source.`,
    roles: `Explique les rôles et compétences des acteurs institutionnels concernés (${institutions}). 
            Précise les limites de compétence et les voies de recours.`,
    deadlines: `Identifie les délais légaux applicables (recours, prescription, péremption). 
               Cite les bases légales exactes pour chaque délai mentionné. Si incertain, l'indiquer explicitement.`,
    definitions: `Fournis les définitions juridiques officielles des concepts mentionnés. 
                  Base-toi sur la doctrine suisse et les textes de loi.`,
    jurisprudence: `Recherche la jurisprudence suisse pertinente (ATF, arrêts cantonaux). 
                   Cite les références exactes des décisions (numéro, date, considérant).`
  };

  return `Tu es un assistant juridique spécialisé en droit suisse, particulièrement en protection de l'adulte et droit administratif.

CONTEXTE:
- Juridiction: ${jurisdiction}
- Institutions concernées: ${institutions}
- Thématiques: ${topics}
${context?.incident_title ? `- Titre incident: ${context.incident_title}` : ''}
${context?.event_date ? `- Date événement: ${context.event_date}` : ''}
${context?.facts_summary ? `- Résumé factuel: ${context.facts_summary}` : ''}

INSTRUCTIONS:
${modeInstructions[mode] || modeInstructions.legal}

RÈGLES STRICTES:
1. Ne JAMAIS affirmer "la loi dit...", "le délai est de...", "l'autorité doit..." SANS citer la source exacte
2. Privilégier les sources officielles: fedlex.admin.ch, admin.ch, bger.ch, vd.ch, edoeb.admin.ch
3. Si une information ne peut être vérifiée avec certitude, l'indiquer clairement ("à vérifier", "source non trouvée")
4. Rester factuel, neutre, sans interprétation émotionnelle ni accusation
5. Maximum 5 sources pertinentes et vérifiables
6. Répondre UNIQUEMENT en français

FORMAT DE RÉPONSE OBLIGATOIRE (JSON strict, pas de texte avant ou après):
{
  "summary": "Résumé clair et compréhensible par un non-juriste (max 300 mots)",
  "key_points": ["Point essentiel 1 avec référence légale si applicable", "Point essentiel 2", ...],
  "citations": [{"title": "Nom source officielle", "url": "https://..."}, ...],
  "confidence": 0.0 à 1.0
}

ÉCHELLE DE CONFIANCE:
- 0.9-1.0: Sources officielles multiples et concordantes
- 0.7-0.9: Sources officielles mais partielles ou uniques
- 0.5-0.7: Sources mixtes ou indirectes
- 0.0-0.5: Informations incertaines, sources insuffisantes`;
}

function extractTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace('www.', '');
    
    for (const [domain, title] of Object.entries(OFFICIAL_DOMAINS)) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return title;
      }
    }
    
    for (const [domain, title] of Object.entries(OFFICIAL_DOMAINS)) {
      if (hostname.includes(domain.split('.')[0])) {
        return title;
      }
    }

    return hostname.split('.').slice(-2, -1)[0] || 'Source externe';
  } catch {
    return 'Source externe';
  }
}

function isOfficialSource(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return PRIORITY_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

function clampConfidence(value: unknown): number {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return 0.3;
  return Math.min(1, Math.max(0, num));
}

async function callPerplexity(
  apiKey: string,
  query: string,
  systemPrompt: string,
  maxCitations: number
): Promise<LegalVerifyResponse> {
  const startTime = Date.now();

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        return_citations: true,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      console.error(`[legal-verify] Perplexity HTTP ${response.status}`);
      return DEGRADED_RESPONSE;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const externalCitations: string[] = data.citations || [];

    // Parse response
    let result: LegalVerifyResponse;
    const warnings: string[] = [];

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          summary: typeof parsed.summary === 'string' ? parsed.summary : content.substring(0, 500),
          key_points: Array.isArray(parsed.key_points) ? parsed.key_points.slice(0, 5) : [],
          citations: [],
          confidence: clampConfidence(parsed.confidence),
          source: 'external'
        };
      } else {
        result = {
          summary: content.substring(0, 1000),
          key_points: [],
          citations: [],
          confidence: 0.3,
          source: 'external'
        };
        warnings.push('json_parse_fallback');
      }
    } catch {
      result = {
        summary: content.substring(0, 1000),
        key_points: [],
        citations: [],
        confidence: 0.25,
        source: 'external'
      };
      warnings.push('json_parse_error');
    }

    // Process citations
    if (externalCitations.length > 0) {
      result.citations = externalCitations
        .slice(0, maxCitations)
        .map((url: string) => ({
          title: extractTitleFromUrl(url),
          url
        }));

      const officialCount = result.citations.filter(c => isOfficialSource(c.url)).length;
      const totalCitations = result.citations.length;

      if (officialCount === 0 && totalCitations > 0) {
        warnings.push('no_official_sources');
        result.confidence = Math.min(result.confidence, 0.5);
      } else if (officialCount < totalCitations / 2) {
        warnings.push('partial_sources');
      } else if (officialCount > 0 && result.confidence < 0.7) {
        result.confidence = Math.min(0.85, result.confidence + 0.15);
      }
    }

    if (result.citations.length === 0) {
      warnings.push('no_citations');
      result.confidence = Math.min(result.confidence, 0.4);
    }

    if (warnings.length > 0) {
      result.warnings = warnings;
    }

    const latency = Date.now() - startTime;
    console.log(`[legal-verify] Perplexity done - Conf: ${result.confidence.toFixed(2)}, Citations: ${result.citations.length}, Latency: ${latency}ms`);

    return result;
  } catch (error) {
    console.error('[legal-verify] Perplexity call failed:', error);
    return DEGRADED_RESPONSE;
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse input
    let body: LegalVerifyRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!body.query || typeof body.query !== 'string' || body.query.trim().length < 10) {
      return new Response(JSON.stringify({ ok: false, error: 'Query requise (minimum 10 caractères)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const mode = body.mode || 'legal';
    const maxCitations = Math.min(body.max_citations || 5, 10);
    const queryHash = hashQuery(body.query.toLowerCase().trim());

    console.log(`[legal-verify] Start - Mode: ${mode}, QueryLen: ${body.query.length}, Force: ${body.force_external || false}`);

    // 1. CHECK CACHE FIRST
    const cached = await checkCache(supabase, queryHash);
    if (cached && !body.force_external) {
      console.log(`[legal-verify] Cache hit - returning saved result`);
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. QUERY LOCAL DATABASE
    const [localArticles, localRefs] = await Promise.all([
      queryLocalLegalArticles(supabase, body.query, body.context?.topics),
      queryLocalLegalReferences(supabase, body.query)
    ]);

    const allLocalMatches = [...localArticles, ...localRefs];
    console.log(`[legal-verify] Local matches: ${allLocalMatches.length}`);

    // 3. GATEKEEPER DECISION
    const gatekeeperResult = shouldCallPerplexity(body, allLocalMatches);
    console.log(`[legal-verify] Gatekeeper: needsExternal=${gatekeeperResult.needsExternal}, reason=${gatekeeperResult.reason}`);

    // 4. IF LOCAL IS SUFFICIENT, RETURN LOCAL RESPONSE
    if (!gatekeeperResult.needsExternal) {
      const localResponse = buildLocalResponse(allLocalMatches, body);
      localResponse.warnings = localResponse.warnings || [];
      localResponse.warnings.push(`gatekeeper:${gatekeeperResult.reason}`);

      const latency = Date.now() - startTime;
      console.log(`[legal-verify] Local only - Conf: ${localResponse.confidence.toFixed(2)}, Latency: ${latency}ms, CostSaved: true`);

      return new Response(JSON.stringify(localResponse), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 5. CALL PERPLEXITY (external verification needed)
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      console.error('[legal-verify] PERPLEXITY_API_KEY not configured');
      // Fall back to local if available
      if (allLocalMatches.length > 0) {
        const fallbackResponse = buildLocalResponse(allLocalMatches, body);
        fallbackResponse.warnings = ['perplexity_unavailable', 'fallback_to_local'];
        return new Response(JSON.stringify(fallbackResponse), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify(DEGRADED_RESPONSE), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const systemPrompt = buildSystemPrompt(mode, body.context);
    const perplexityResult = await callPerplexity(PERPLEXITY_API_KEY, body.query, systemPrompt, maxCitations);

    // 6. HYBRID RESPONSE: merge local + external if relevant
    if (allLocalMatches.length > 0 && perplexityResult.source === 'external') {
      // Enrich external response with local context
      const localCitations = allLocalMatches.slice(0, 2).map(m => ({
        title: `${m.code_name} ${m.article_number} (Référentiel interne)`,
        url: m.domain === 'LPD' ? 'https://fedlex.admin.ch/eli/cc/2022/491/fr' : 'https://fedlex.admin.ch'
      }));

      perplexityResult.citations = [...perplexityResult.citations, ...localCitations].slice(0, maxCitations);
      perplexityResult.source = 'hybrid';
    }

    // 7. SAVE TO CACHE
    if (perplexityResult.source !== 'degraded') {
      await saveToCache(supabase, queryHash, perplexityResult);
    }

    const latency = Date.now() - startTime;
    console.log(`[legal-verify] Done - Source: ${perplexityResult.source}, Conf: ${perplexityResult.confidence.toFixed(2)}, Latency: ${latency}ms`);

    return new Response(JSON.stringify(perplexityResult), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const latency = Date.now() - startTime;
    console.error(`[legal-verify] Unexpected error after ${latency}ms:`, error instanceof Error ? error.message : 'Unknown');

    return new Response(JSON.stringify(DEGRADED_RESPONSE), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
