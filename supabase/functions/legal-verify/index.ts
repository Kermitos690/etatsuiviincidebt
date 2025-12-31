import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { seedLegalReferencesIfEmpty, type SeedResult } from "./seedLegalReferences.ts";

// ============================================================
// CORS
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// TYPES
// ============================================================

type LegalVerifyMode =
  | "legal"
  | "procedure"
  | "roles"
  | "deadlines"
  | "definitions"
  | "jurisprudence";

type LegalCitation = {
  title: string;
  url: string;
};

type LegalVerifyRequest = {
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
};

type LegalVerifyResponse = {
  summary: string;
  key_points: string[];
  citations: LegalCitation[];
  confidence: number; // 0..1
  warnings?: string[];
  source: "local" | "external" | "hybrid" | "degraded";
  cost_saved: boolean;
};

type LocalLegalMatch = {
  code_name: string;
  article_number: string;
  article_title?: string;
  article_text: string;
  domain?: string;
  keywords?: string[];
  relevance: number;
};

type GatekeeperDecision = {
  needsExternal: boolean;
  reason: string;
};

// ============================================================
// CONSTANTS
// ============================================================

const OFFICIAL_DOMAIN_TITLES: Record<string, string> = {
  "fedlex.admin.ch": "fedlex.admin.ch",
  "admin.ch": "admin.ch",
  "edoeb.admin.ch": "edoeb.admin.ch",
  "bger.ch": "bger.ch",
  "vd.ch": "vd.ch",
  "ch.ch": "ch.ch",
  "bfs.admin.ch": "bfs.admin.ch",
  "seco.admin.ch": "seco.admin.ch",
  "bsv.admin.ch": "bsv.admin.ch",
  "ejpd.admin.ch": "ejpd.admin.ch",
};

const PRIORITY_DOMAINS = [
  "fedlex.admin.ch",
  "admin.ch",
  "edoeb.admin.ch",
  "bger.ch",
  "vd.ch",
];

const EXTERNAL_REQUIRED_KEYWORDS = [
  "jurisprudence",
  "atf",
  "arrêt",
  "tribunal fédéral",
  "décision",
  "jugement",
  "recours accepté",
  "rejeté",
  "délai exact",
  "combien de jours",
  "quel délai",
];

const LOCAL_SUFFICIENT_KEYWORDS = [
  "principe",
  "définition",
  "rôle",
  "compétence",
  "curateur",
  "curatelle",
  "protection adulte",
  "lpd",
  "données personnelles",
  "droit d'accès",
];

const LOCAL_ONLY_BASE_URLS: Record<string, string> = {
  LPD: "https://www.fedlex.admin.ch/eli/cc/2022/491/fr",
  CC: "https://www.fedlex.admin.ch/eli/cc/24/233_245_233/fr",
  LPGA: "https://www.fedlex.admin.ch/eli/cc/2002/510/fr",
  LAI: "https://www.fedlex.admin.ch/eli/cc/1959/827_857_845/fr",
};

const DEGRADED_RESPONSE: LegalVerifyResponse = {
  summary: "Cadre légal non vérifié – service externe indisponible",
  key_points: [],
  citations: [],
  confidence: 0,
  warnings: ["perplexity_unavailable"],
  source: "degraded",
  cost_saved: false,
};

const CACHE_TTL_DAYS = 7;

// ============================================================
// ANTI-ABUSE: DEBUG RATE-LIMIT & SEED COOLDOWN (in-memory, best-effort)
// ============================================================

// Rate limit for debug requests: 5 per minute per IP+queryHash
const DEBUG_RATE_LIMIT = { windowMs: 60000, maxRequests: 5 };
const debugRateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Seed cooldown: 1 execution per 10 minutes per IP
const SEED_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const seedCooldownStore = new Map<string, number>();

function cleanupDebugRateLimit(): void {
  const now = Date.now();
  for (const [key, entry] of debugRateLimitStore.entries()) {
    if (entry.resetAt < now) {
      debugRateLimitStore.delete(key);
    }
  }
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

function checkDebugRateLimit(key: string): { allowed: boolean; remaining: number; resetAt: number } {
  cleanupDebugRateLimit();
  const now = Date.now();
  const entry = debugRateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    const resetAt = now + DEBUG_RATE_LIMIT.windowMs;
    debugRateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: DEBUG_RATE_LIMIT.maxRequests - 1, resetAt };
  }

  if (entry.count >= DEBUG_RATE_LIMIT.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: DEBUG_RATE_LIMIT.maxRequests - entry.count, resetAt: entry.resetAt };
}

function checkSeedCooldown(ip: string): { allowed: boolean; reason: string } {
  const now = Date.now();
  const key = "seed:" + ip;
  const lastAt = seedCooldownStore.get(key) || 0;
  if (now - lastAt < SEED_COOLDOWN_MS) {
    return { allowed: false, reason: "cooldown_active" };
  }
  return { allowed: true, reason: "" };
}

function markSeedExecuted(ip: string): void {
  seedCooldownStore.set("seed:" + ip, Date.now());
}

// ============================================================
// UTILITIES
// ============================================================

function isHostMatch(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith("." + domain);
}

async function hashQuery(query: string): Promise<string> {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, " ");
  const data = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return "lv_" + hex;
}

function calculateRelevance(text: string, query: string, keywords?: string[]): number {
  const q = (query || "").toLowerCase();
  const t = (text || "").toLowerCase();
  const qWords = q.split(/\s+/).map((w) => w.trim()).filter((w) => w.length >= 3);

  let hits = 0;
  for (const w of qWords) {
    if (t.includes(w)) hits += 1;
  }

  let kwHits = 0;
  if (Array.isArray(keywords)) {
    for (const k of keywords) {
      const kk = String(k || "").toLowerCase();
      if (kk && q.includes(kk)) kwHits += 1;
    }
  }

  // simple bounded score
  const score = Math.min(1, hits * 0.12 + kwHits * 0.22);
  return score;
}

function extractTitleFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    for (const domain of Object.keys(OFFICIAL_DOMAIN_TITLES)) {
      // SECURITY: strict match only
      if (isHostMatch(hostname, domain)) return OFFICIAL_DOMAIN_TITLES[domain];
    }
    return hostname;
  } catch {
    return "source";
  }
}

function clampConfidence(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function normalizeText(s: string): string {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function uniqueCitations(citations: LegalCitation[], max: number): LegalCitation[] {
  const seen = new Set<string>();
  const out: LegalCitation[] = [];
  for (const c of citations) {
    const url = String(c?.url || "").trim();
    if (!url) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ title: String(c?.title || extractTitleFromUrl(url)), url });
    if (out.length >= max) break;
  }
  return out;
}

// ============================================================
// CACHE (SINGLE DEFINITIONS)
// ============================================================

async function checkCache(supabase: any, queryHash: string): Promise<LegalVerifyResponse | null> {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - CACHE_TTL_DAYS);

    const { data, error } = await supabase
      .from("legal_search_results")
      .select("summary, keywords, source_url, source_name, relevance_score, created_at")
      .eq("search_query", queryHash)
      .gte("created_at", cutoff.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    const row: any = data;

    const summary = typeof row.summary === "string" ? row.summary : "";
    const keywords = Array.isArray(row.keywords) ? row.keywords.map((k: any) => String(k)) : [];
    const sourceUrl = typeof row.source_url === "string" ? row.source_url : "";
    const sourceName = typeof row.source_name === "string" ? row.source_name : "";
    const relevanceScore = typeof row.relevance_score === "number" ? row.relevance_score : 0;

    return {
      summary,
      key_points: keywords,
      citations: sourceUrl
        ? [{ title: sourceName || extractTitleFromUrl(sourceUrl), url: sourceUrl }]
        : [],
      confidence: clampConfidence(relevanceScore / 100),
      warnings: ["cache_hit"],
      source: "local",
      cost_saved: true,
    };
  } catch {
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
    const firstCitation = result.citations?.[0];
    const payload: any = {
      search_query: queryHash,
      title: normalizeText(result.summary).slice(0, 255) || "Cadre juridique",
      summary: result.summary,
      keywords: (Array.isArray(result.key_points) ? result.key_points : []).slice(0, 12),
      source_url: typeof firstCitation?.url === "string" ? firstCitation.url : "",
      source_name: typeof firstCitation?.title === "string" ? firstCitation.title : "",
      source_type: result.source,
      relevance_score: Math.round(clampConfidence(result.confidence) * 100),
      is_saved: true,
      user_id: userId || null,
    };

    await supabase.from("legal_search_results").insert(payload);
  } catch {
    // Never fail the request because of caching
  }
}

// ============================================================
// LOCAL DB
// ============================================================

// Pagination: utiliser paginatedFetchPure via wrapper paginatedFetchSupabase.
// Ne pas copier/coller la logique de pagination ici.
import { paginatedFetch as paginatedFetchPure } from "../_shared/paginatedFetch.ts";

// Wrapper for Supabase-specific pagination (uses pure module internally)
// Pagination debug info (without probes - probes are separate)
type PaginationDebugInfo = {
  enabled: boolean;
  batchSize: number;
  maxRows: number;
  calls: number;
  ranges: { fromIndex: number; toIndex: number }[];
  rowsFetched: number;
  stoppedBecause: "not_stopped" | "error" | "empty_page" | "last_page" | "max_rows";
  // Relevance debug (only for references)
  topRelevanceScores?: number[];
  topKeywordsMatched?: string[];
};

// Probe diagnostics (separate from pagination)
type ProbeDebugInfo = {
  probeSansFiltre?: number | null;
  probeAvecFiltre?: number | null;
  probeError?: string | null;
};

// Helper to build the debug object in a stable format
function buildDebugObject(
  debugPagination: boolean,
  debugProbes: boolean,
  seedReferences: boolean,
  debugInfoArticles: PaginationDebugInfo | undefined,
  debugInfoReferences: PaginationDebugInfo | undefined,
  probesArticles: ProbeDebugInfo | undefined,
  probesReferences: ProbeDebugInfo | undefined,
  seedRefs: SeedResult | undefined
): any | undefined {
  if (!debugPagination) return undefined;
  
  const debugObj: any = {
    debug_version: 1,
    pagination: {
      articles: debugInfoArticles,
      references: debugInfoReferences,
    },
  };
  
  // Probes only if debug_probes=true
  if (debugProbes && (probesArticles || probesReferences)) {
    debugObj.probes = {};
    if (probesArticles) debugObj.probes.articles = probesArticles;
    if (probesReferences) debugObj.probes.references = probesReferences;
  }
  
  // Seed only if seed_references=true
  if (seedReferences && seedRefs) {
    debugObj.seed = { references: seedRefs };
  }
  
  return debugObj;
}

async function paginatedFetchSupabase(
  supabase: any,
  table: string,
  selectCols: string,
  filters?: { column: string; value: any }[],
  batchSize = 500,
  maxRows = 2000,
  debugInfo?: PaginationDebugInfo
): Promise<unknown[]> {
  // Track stop reason in outer scope
  let lastPageLength = 0;
  let lastLimit = 0;
  let hadError = false;

  const queryFactory = async (offset: number, limit: number) => {
    const fromIndex = offset;
    const toIndex = offset + limit - 1;
    lastLimit = limit;

    // Track ranges if debug enabled
    if (debugInfo) {
      debugInfo.calls = debugInfo.calls + 1;
      debugInfo.ranges.push({ fromIndex, toIndex });
    }

    let q = supabase
      .from(table)
      .select(selectCols)
      .range(fromIndex, toIndex);

    if (filters && Array.isArray(filters)) {
      for (const f of filters) {
        q = q.eq(f.column, f.value);
      }
    }

    const res = await q;
    const dataArr = Array.isArray(res.data) ? res.data : [];
    lastPageLength = dataArr.length;

    // Track rows fetched if debug enabled
    if (debugInfo) {
      debugInfo.rowsFetched = debugInfo.rowsFetched + dataArr.length;
    }

    if (res.error) {
      hadError = true;
    }

    return {
      data: dataArr,
      error: res.error ? res.error : null,
    };
  };

  const result = await paginatedFetchPure(queryFactory, batchSize, maxRows);

  // Determine stop reason after pagination completes
  if (debugInfo) {
    if (hadError) {
      debugInfo.stoppedBecause = "error";
    } else if (lastPageLength === 0) {
      debugInfo.stoppedBecause = "empty_page";
    } else if (lastPageLength < lastLimit) {
      debugInfo.stoppedBecause = "last_page";
    } else if (debugInfo.rowsFetched >= maxRows) {
      debugInfo.stoppedBecause = "max_rows";
    } else {
      debugInfo.stoppedBecause = "empty_page"; // Pagination stopped naturally
    }
  }

  return result;
}

async function queryLocalLegalArticles(
  supabase: any,
  query: string,
  _topics?: string[],
  debugInfo?: PaginationDebugInfo,
  enableProbes?: boolean,
  probeInfo?: ProbeDebugInfo
): Promise<LocalLegalMatch[]> {
  try {
    // Probe diagnostics ONLY if debug AND enableProbes are both true
    if (debugInfo && enableProbes && probeInfo) {
      try {
        // Probe sans filtre
        const probeSans = await supabase
          .from("legal_articles")
          .select("id", { count: "exact", head: true });
        probeInfo.probeSansFiltre = probeSans.count ?? null;
        
        // Probe avec filtre (is_current = true)
        const probeAvec = await supabase
          .from("legal_articles")
          .select("id", { count: "exact", head: true })
          .eq("is_current", true);
        probeInfo.probeAvecFiltre = probeAvec.count ?? null;
        
        if (probeSans.error) {
          probeInfo.probeError = probeSans.error.message;
        } else if (probeAvec.error) {
          probeInfo.probeError = probeAvec.error.message;
        }
      } catch (probeErr: any) {
        probeInfo.probeError = probeErr?.message || "probe_failed";
      }
    }

    // Paginated fetch
    const batchSize = debugInfo ? debugInfo.batchSize : 500;
    const maxRows = debugInfo ? debugInfo.maxRows : 2000;
    const data = await paginatedFetchSupabase(
      supabase,
      "legal_articles",
      "code_name, article_number, article_title, article_text, domain, keywords",
      [{ column: "is_current", value: true }],
      batchSize,
      maxRows,
      debugInfo
    );

    const matches: LocalLegalMatch[] = [];
    for (const row of data as any[]) {
      const code_name = String(row?.code_name || "");
      const article_number = String(row?.article_number || "");
      const article_title = row?.article_title ? String(row.article_title) : undefined;
      const article_text = String(row?.article_text || "");
      const domain = row?.domain ? String(row.domain) : undefined;
      const keywords = Array.isArray(row?.keywords) ? row.keywords.map((k: any) => String(k)) : undefined;

      const relevance = calculateRelevance(
        normalizeText(`${code_name} ${article_number} ${article_title || ""} ${article_text}`),
        query,
        keywords
      );

      if (relevance > 0.08) {
        matches.push({
          code_name,
          article_number,
          article_title,
          article_text,
          domain,
          keywords,
          relevance,
        });
      }
    }

    matches.sort((a, b) => b.relevance - a.relevance);
    return matches.slice(0, 5);
  } catch {
    return [];
  }
}

async function queryLocalLegalReferences(
  supabase: any,
  query: string,
  debugInfo?: PaginationDebugInfo,
  enableProbes?: boolean,
  probeInfo?: ProbeDebugInfo
): Promise<LocalLegalMatch[]> {
  try {
    // Probe diagnostics ONLY if debug AND enableProbes are both true
    if (debugInfo && enableProbes && probeInfo) {
      try {
        // Probe sans filtre (legal_references n'a pas de filtre ici)
        const probeSans = await supabase
          .from("legal_references")
          .select("id", { count: "exact", head: true });
        probeInfo.probeSansFiltre = probeSans.count ?? null;
        
        // Probe avec filtre = même chose car pas de filtre appliqué
        probeInfo.probeAvecFiltre = probeSans.count ?? null;
        
        if (probeSans.error) {
          probeInfo.probeError = probeSans.error.message;
        }
      } catch (probeErr: any) {
        probeInfo.probeError = probeErr?.message || "probe_failed";
      }
    }

    // Paginated fetch
    const batchSize = debugInfo ? debugInfo.batchSize : 500;
    const maxRows = debugInfo ? debugInfo.maxRows : 2000;
    const data = await paginatedFetchSupabase(
      supabase,
      "legal_references",
      "code_name, article_number, article_text, domain, keywords",
      undefined,
      batchSize,
      maxRows,
      debugInfo
    );

    const matches: LocalLegalMatch[] = [];
    const qLower = query.toLowerCase();
    
    // Debug tracking arrays (only used if debugInfo exists)
    const debugScores: number[] = [];
    const debugKwMatched: string[] = [];

    for (const row of data as any[]) {
      const code_name = String(row?.code_name || "");
      const article_number = String(row?.article_number || "");
      const article_text = String(row?.article_text || "");
      const domain = row?.domain ? String(row.domain) : undefined;
      const keywords = Array.isArray(row?.keywords) ? row.keywords.map((k: any) => String(k)) : undefined;

      const relevance = calculateRelevance(
        normalizeText(`${code_name} ${article_number} ${article_text}`),
        query,
        keywords
      );

      // 12.2: Keyword boost - check if any keyword is in query
      let kwHits = 0;
      const matchedKws: string[] = [];
      if (keywords && keywords.length > 0) {
        for (const kw of keywords) {
          const kwLower = String(kw).toLowerCase();
          if (qLower.includes(kwLower)) {
            kwHits++;
            matchedKws.push(kwLower);
          }
        }
      }
      const relevanceBoosted = kwHits > 0 ? Math.min(1, relevance + 0.12) : relevance;

      // Track for debug
      if (debugInfo) {
        debugScores.push(relevanceBoosted);
        for (const mk of matchedKws) {
          debugKwMatched.push(mk);
        }
      }

      // 12.1: Lowered threshold from 0.08 to 0.06 for references
      if (relevanceBoosted > 0.06) {
        matches.push({
          code_name,
          article_number,
          article_text,
          domain,
          keywords,
          relevance: relevanceBoosted,
        });
      }
    }

    // 12.3: Populate debug info with top scores and keywords
    if (debugInfo) {
      debugScores.sort((a, b) => b - a);
      debugInfo.topRelevanceScores = debugScores.slice(0, 3);
      // Deduplicate keywords and take top 10
      const uniqueKws = Array.from(new Set(debugKwMatched));
      debugInfo.topKeywordsMatched = uniqueKws.slice(0, 10);
    }

    matches.sort((a, b) => b.relevance - a.relevance);
    return matches.slice(0, 3);
  } catch {
    return [];
  }
}

// ============================================================
// GATEKEEPER
// ============================================================

function shouldCallPerplexity(request: LegalVerifyRequest, localMatches: LocalLegalMatch[]): GatekeeperDecision {
  const q = (request.query || "").toLowerCase();
  const mode = request.mode || "legal";

  if (request.force_external) return { needsExternal: true, reason: "force_external" };
  if (mode === "jurisprudence") return { needsExternal: true, reason: "jurisprudence" };

  for (const kw of EXTERNAL_REQUIRED_KEYWORDS) {
    if (q.includes(kw)) return { needsExternal: true, reason: `external_keyword:${kw}` };
  }

  if (mode === "deadlines") {
    const patterns = ["exact", "précis", "combien", "jours", "quel délai"];
    if (patterns.some((p) => q.includes(p))) {
      return { needsExternal: true, reason: "deadline_precision" };
    }
  }

  const high = localMatches.filter((m) => m.relevance >= 0.5);
  if (high.length >= 2) return { needsExternal: false, reason: "local>=2_high" };

  if ((mode === "roles" || mode === "definitions") && localMatches.length >= 1) {
    return { needsExternal: false, reason: "local_for_mode" };
  }

  if (localMatches.length >= 1) return { needsExternal: false, reason: "local>=1" };

  // optional heuristic: keyword suggests local would suffice (still requires at least one match to answer)
  for (const kw of LOCAL_SUFFICIENT_KEYWORDS) {
    if (q.includes(kw)) {
      return { needsExternal: true, reason: `local_keyword_but_no_match:${kw}` };
    }
  }

  return { needsExternal: true, reason: "no_local_match" };
}

// ============================================================
// LOCAL RESPONSE
// ============================================================

function buildLocalResponse(localMatches: LocalLegalMatch[], reason: string): LegalVerifyResponse {
  const matches = localMatches.slice(0, 8);

  const articles = matches
    .map((m) => `${m.code_name} art. ${m.article_number}`)
    .filter(Boolean)
    .join(", ");

  const summary = matches.length
    ? `Cadre juridique basé sur le référentiel interne. Articles pertinents : ${articles}.`
    : "Cadre juridique basé sur le référentiel interne.";

  const key_points = matches
    .map((m) => {
      const text = normalizeText(m.article_text || m.article_title || "");
      if (!text) return "";
      return text.length > 150 ? text.slice(0, 147) + "..." : text;
    })
    .filter(Boolean)
    .slice(0, 8);

  const citations: LegalCitation[] = uniqueCitations(
    matches
      .map((m) => {
        const base = LOCAL_ONLY_BASE_URLS[m.code_name] || "https://fedlex.admin.ch";
        return {
          title: `${m.code_name} art. ${m.article_number} (référentiel)`,
          url: base,
        };
      }),
    5
  );

  const avg = matches.length ? matches.reduce((s, m) => s + m.relevance, 0) / matches.length : 0;
  const confidence = clampConfidence(Math.min(0.75, avg + 0.3));

  return {
    summary,
    key_points,
    citations,
    confidence,
    warnings: [`gatekeeper:${reason}`],
    source: "local",
    cost_saved: true,
  };
}

// ============================================================
// PERPLEXITY
// ============================================================

function buildSystemPrompt(request: LegalVerifyRequest): string {
  const ctx = request.context || {};
  const mode = request.mode || "legal";

  const parts: string[] = [];
  parts.push("Tu es un assistant juridique suisse. Tu dois répondre en français.");
  parts.push("Réponds UNIQUEMENT en JSON strict.");
  parts.push("Ne donne pas de conseils juridiques personnalisés; reste factuel et cite des sources.");
  parts.push("Privilégie les sources officielles: fedlex.admin.ch, admin.ch, edoeb.admin.ch, bger.ch, vd.ch.");
  parts.push(`Mode: ${mode}.`);
  parts.push(`Juridiction: ${ctx.jurisdiction || "CH"}.`);
  if (ctx.institutions?.length) parts.push(`Institutions: ${ctx.institutions.join(", ")}.`);
  if (ctx.topics?.length) parts.push(`Thèmes: ${ctx.topics.join(", ")}.`);

  parts.push("Format JSON attendu:");
  parts.push("{");
  parts.push('  "summary": "...",');
  parts.push('  "key_points": ["..."],');
  parts.push('  "citations": [{"title":"...","url":"https://..."}],');
  parts.push('  "confidence": 0.0');
  parts.push("}");

  return parts.join("\n");
}

function parseJsonFromContent(content: string): { parsed: any | null; warnings: string[] } {
  const warnings: string[] = [];
  try {
    return { parsed: JSON.parse(content), warnings };
  } catch {
    // fallback: try to extract last JSON block
    const m = content.match(/\{[\s\S]*?\}\s*$/);
    if (!m) {
      warnings.push("json_parse_error");
      return { parsed: null, warnings };
    }
    try {
      const parsed = JSON.parse(m[0]);
      warnings.push("json_parse_fallback");
      return { parsed, warnings };
    } catch {
      warnings.push("json_parse_error");
      return { parsed: null, warnings };
    }
  }
}

function isOfficialUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return Object.keys(OFFICIAL_DOMAIN_TITLES).some((d) => isHostMatch(hostname, d));
  } catch {
    return false;
  }
}

async function callPerplexity(
  apiKey: string,
  query: string,
  systemPrompt: string,
  maxCitations: number
): Promise<LegalVerifyResponse> {
  const baseWarnings: string[] = [];

  const doFetch = async (domainFilter?: string[]) => {
    const body: any = {
      model: "sonar",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      return_citations: true,
      max_tokens: 2000,
    };
    if (domainFilter && domainFilter.length) {
      body.search_domain_filter = domainFilter;
    }

    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    const content =
      data?.choices?.[0]?.message?.content && typeof data.choices[0].message.content === "string"
        ? data.choices[0].message.content
        : "";

    const citationsRaw: string[] = Array.isArray(data?.citations) ? data.citations : [];
    return { content, citationsRaw };
  };

  try {
    // pass 1 (official domains)
    const pass1 = await doFetch(PRIORITY_DOMAINS);

    // parse content
    const p1 = parseJsonFromContent(pass1.content);
    if (p1.warnings.length) baseWarnings.push(...p1.warnings);

    let parsed = p1.parsed;
    let citationsRaw = pass1.citationsRaw;

    // If no citations in response, do a second pass without domain filter
    if (!Array.isArray(citationsRaw) || citationsRaw.length === 0) {
      const pass2 = await doFetch(undefined);
      baseWarnings.push("official_filter_no_results");

      const p2 = parseJsonFromContent(pass2.content);
      // if first parse failed but second succeeds, use second
      if (!parsed && p2.parsed) {
        parsed = p2.parsed;
        baseWarnings.push(...p2.warnings);
      }
      citationsRaw = Array.isArray(pass2.citationsRaw) && pass2.citationsRaw.length ? pass2.citationsRaw : citationsRaw;
    }

    if (!parsed || typeof parsed !== "object") {
      return {
        ...DEGRADED_RESPONSE,
        warnings: Array.from(new Set([...(DEGRADED_RESPONSE.warnings || []), ...baseWarnings])),
      };
    }

    const summary = typeof parsed.summary === "string" ? parsed.summary : "";
    const key_points = Array.isArray(parsed.key_points)
      ? parsed.key_points.map((x: any) => String(x)).filter(Boolean)
      : [];

    const parsedCitations: LegalCitation[] = Array.isArray(parsed.citations)
      ? parsed.citations
          .map((c: any) => ({ title: String(c?.title || ""), url: String(c?.url || "") }))
          .filter((c: any) => c.url)
      : [];

    const urlCitations: LegalCitation[] = Array.isArray(citationsRaw)
      ? citationsRaw.map((u) => ({ title: extractTitleFromUrl(String(u)), url: String(u) }))
      : [];

    const citations = uniqueCitations([...parsedCitations, ...urlCitations], maxCitations);

    const warnings: string[] = [...baseWarnings];

    if (citations.length === 0) warnings.push("no_citations");

    const officialCount = citations.filter((c) => isOfficialUrl(c.url)).length;
    if (citations.length > 0 && officialCount === 0) warnings.push("no_official_sources");
    if (citations.length > 0 && officialCount > 0 && officialCount < citations.length) warnings.push("partial_sources");

    const confidence =
      typeof parsed.confidence === "number"
        ? clampConfidence(parsed.confidence)
        : citations.length
          ? 0.7
          : 0.4;

    return {
      summary,
      key_points,
      citations,
      confidence,
      warnings: warnings.length ? Array.from(new Set(warnings)) : undefined,
      source: "external",
      cost_saved: false,
    };
  } catch {
    return { ...DEGRADED_RESPONSE };
  }
}

function mergeHybridResponse(
  externalResponse: LegalVerifyResponse,
  localMatches: LocalLegalMatch[],
  maxCitations: number
): LegalVerifyResponse {
  if (externalResponse.source === "degraded") return externalResponse;

  const existing = new Set(externalResponse.citations.map((c) => String(c.url)));
  const additions: LegalCitation[] = [];

  for (const m of localMatches) {
    const url = LOCAL_ONLY_BASE_URLS[m.code_name] || "https://fedlex.admin.ch";
    if (existing.has(url)) continue;
    additions.push({ title: `${m.code_name} art. ${m.article_number} (référentiel)`, url });
    existing.add(url);
    if (additions.length >= 2) break;
  }

  if (additions.length === 0) return externalResponse;

  const merged = uniqueCitations([...externalResponse.citations, ...additions], maxCitations);

  const warnings = Array.isArray(externalResponse.warnings) ? [...externalResponse.warnings] : [];
  warnings.push("hybrid_local_merge");

  return {
    ...externalResponse,
    citations: merged,
    warnings: Array.from(new Set(warnings)),
    source: "hybrid",
    cost_saved: false,
  };
}

// ============================================================
// HANDLER
// ============================================================

serve(async (req) => {
  const start = Date.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let mode: LegalVerifyMode = "legal";

  try {
    const body = (await req.json()) as Partial<LegalVerifyRequest>;
    const query = typeof body.query === "string" ? body.query.trim() : "";
    mode = (body.mode || "legal") as LegalVerifyMode;

    if (query.length < 10) {
      return new Response(JSON.stringify({ error: "query_too_short" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const maxCitations =
      typeof body.max_citations === "number" && body.max_citations > 0
        ? Math.min(10, Math.floor(body.max_citations))
        : 5;

    // Debug flags - all strictly opt-in
    const debugPagination = Boolean((body as any).debug_pagination);
    // Probes and seed only active if debug_pagination is true
    const debugProbes = debugPagination && Boolean((body as any).debug_probes);
    let seedReferences = debugPagination && Boolean((body as any).seed_references);

    // ========== ANTI-ABUSE: Rate limit for debug mode (IP + queryHash) ==========
    let clientIp = "";
    if (debugPagination) {
      clientIp = getClientIp(req);
      // Compute queryHash SAFE: only if query is a non-empty string
      const queryHashForRL = (typeof query === "string" && query.trim().length > 0)
        ? await hashQuery(query)
        : "noq";
      const rlKey = "debug:" + clientIp + ":" + queryHashForRL;
      const rateCheck = checkDebugRateLimit(rlKey);
      
      if (!rateCheck.allowed) {
        // Rate limited: EARLY RETURN - do not execute cache, probes, seed, local queries
        const rateLimitedResponse = {
          ...DEGRADED_RESPONSE,
          debug: {
            debug_version: 1,
            rate_limited: true,
            remaining: rateCheck.remaining,
            window_ms: DEBUG_RATE_LIMIT.windowMs,
          },
        };
        const latency = Date.now() - start;
        console.log(JSON.stringify({ latency, source: "degraded", rate_limited: true, mode }));
        return new Response(JSON.stringify(rateLimitedResponse), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ========== ANTI-ABUSE: Seed cooldown check (per IP) ==========
    let seedCooldownActive = false;
    if (seedReferences) {
      const seedCheck = checkSeedCooldown(clientIp);
      if (!seedCheck.allowed) {
        seedCooldownActive = true;
      }
    }

    const debugInfoArticles: PaginationDebugInfo | undefined = debugPagination
      ? { enabled: true, batchSize: 1, maxRows: 2000, calls: 0, ranges: [], rowsFetched: 0, stoppedBecause: "not_stopped" }
      : undefined;
    const debugInfoReferences: PaginationDebugInfo | undefined = debugPagination
      ? { enabled: true, batchSize: 1, maxRows: 2000, calls: 0, ranges: [], rowsFetched: 0, stoppedBecause: "not_stopped" }
      : undefined;
    
    // Probe info objects - only created if debug_probes is true
    const probesArticles: ProbeDebugInfo | undefined = debugProbes ? {} : undefined;
    const probesReferences: ProbeDebugInfo | undefined = debugProbes ? {} : undefined;

    const request: LegalVerifyRequest = {
      query,
      context: body.context || undefined,
      mode,
      max_citations: maxCitations,
      force_external: Boolean(body.force_external),
    };

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      const latency = Date.now() - start;
      console.log(
        JSON.stringify({
          latency,
          source: DEGRADED_RESPONSE.source,
          citationsCount: DEGRADED_RESPONSE.citations.length,
          confidence: DEGRADED_RESPONSE.confidence,
          mode,
        })
      );

      return new Response(JSON.stringify(DEGRADED_RESPONSE), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase: any = createClient(supabaseUrl, serviceKey);

    // Seed legal_references ONLY if debug_pagination AND seed_references are both true AND no cooldown
    let seedRefs: SeedResult | undefined;
    if (seedReferences && !seedCooldownActive) {
      seedRefs = await seedLegalReferencesIfEmpty(supabase);
      // Mark seed as executed ONLY if actual seed happened (not skipped due to existing rows)
      if (seedRefs && seedRefs.seeded) {
        markSeedExecuted(clientIp);
      }
    } else if (seedReferences && seedCooldownActive) {
      // Return cooldown info instead of executing seed
      seedRefs = { seeded: false, inserted: 0, reason: "cooldown_active" };
    }

    const queryHash = await hashQuery(query);

    // Cache hit (only if not forcing external and not debugging)
    if (!request.force_external && !debugPagination) {
      const cached = await checkCache(supabase, queryHash);
      if (cached) {
        const latency = Date.now() - start;
        console.log(
          JSON.stringify({
            latency,
            source: cached.source,
            citationsCount: cached.citations.length,
            confidence: cached.confidence,
            mode,
          })
        );

        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Local first - pass separate debug info and probe info to each table query
    const [localArticles, localRefs] = await Promise.all([
      queryLocalLegalArticles(supabase, query, request.context?.topics, debugInfoArticles, debugProbes, probesArticles),
      queryLocalLegalReferences(supabase, query, debugInfoReferences, debugProbes, probesReferences),
    ]);

    const localMatches = [...localArticles, ...localRefs].sort((a, b) => b.relevance - a.relevance);

    const gate = shouldCallPerplexity(request, localMatches);

    // Local answer
    if (!gate.needsExternal) {
      const localResponse = buildLocalResponse(localMatches, gate.reason);
      await saveToCache(supabase, queryHash, localResponse, undefined);

      const latency = Date.now() - start;
      console.log(
        JSON.stringify({
          latency,
          source: localResponse.source,
          citationsCount: localResponse.citations.length,
          confidence: localResponse.confidence,
          mode,
        })
      );

      // Build debug object using helper function
      const debugObj = buildDebugObject(debugPagination, debugProbes, seedReferences, debugInfoArticles, debugInfoReferences, probesArticles, probesReferences, seedRefs);
      const responseBody = debugObj ? { ...localResponse, debug: debugObj } : localResponse;

      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // External path
    const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");

    if (!perplexityKey) {
      if (localMatches.length > 0) {
        const localFallback = buildLocalResponse(localMatches, gate.reason);
        const warnings = Array.isArray(localFallback.warnings) ? [...localFallback.warnings] : [];
        warnings.push("perplexity_unavailable", "fallback_to_local");

        const response: LegalVerifyResponse = {
          ...localFallback,
          warnings: Array.from(new Set(warnings)),
          source: "local",
          cost_saved: true,
        };

        await saveToCache(supabase, queryHash, response, undefined);

        const latency = Date.now() - start;
        console.log(
          JSON.stringify({
            latency,
            source: response.source,
            citationsCount: response.citations.length,
            confidence: response.confidence,
            mode,
          })
        );

        // Build debug object using helper function
        const debugObj = buildDebugObject(debugPagination, debugProbes, seedReferences, debugInfoArticles, debugInfoReferences, probesArticles, probesReferences, seedRefs);
        const responseBody = debugObj ? { ...response, debug: debugObj } : response;

        return new Response(JSON.stringify(responseBody), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const degraded = { ...DEGRADED_RESPONSE };
      await saveToCache(supabase, queryHash, degraded, undefined);

      const latency = Date.now() - start;
      console.log(
        JSON.stringify({
          latency,
          source: degraded.source,
          citationsCount: degraded.citations.length,
          confidence: degraded.confidence,
          mode,
        })
      );

      return new Response(JSON.stringify(degraded), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = buildSystemPrompt(request);
    const external = await callPerplexity(perplexityKey, query, systemPrompt, maxCitations);

    const merged = localMatches.length ? mergeHybridResponse(external, localMatches, maxCitations) : external;

    await saveToCache(supabase, queryHash, merged, undefined);

    const latency = Date.now() - start;
    console.log(
      JSON.stringify({
        latency,
        source: merged.source,
        citationsCount: merged.citations.length,
        confidence: merged.confidence,
        mode,
      })
    );

    // Build debug object using helper function
    const debugObj = buildDebugObject(debugPagination, debugProbes, seedReferences, debugInfoArticles, debugInfoReferences, probesArticles, probesReferences, seedRefs);
    const responseBody = debugObj ? { ...merged, debug: debugObj } : merged;

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    const latency = Date.now() - start;
    console.log(
      JSON.stringify({
        latency,
        source: DEGRADED_RESPONSE.source,
        citationsCount: DEGRADED_RESPONSE.citations.length,
        confidence: DEGRADED_RESPONSE.confidence,
        mode,
      })
    );

    return new Response(JSON.stringify(DEGRADED_RESPONSE), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
