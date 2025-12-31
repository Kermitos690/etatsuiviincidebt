/**
 * Legal Verify Utility Functions
 * Pure functions exported for testing and reuse
 * 
 * Note: paginatedFetch is NOT here - it stays in the Edge Function
 * because it's Supabase-specific and should be tested with mocked Supabase client.
 */

// ============================================================
// CONSTANTS
// ============================================================

export const LEGAL_VERIFY_BATCH_SIZE = 500;
export const LEGAL_VERIFY_MAX_ROWS = 2000;
export const CACHE_TTL_DAYS = 7;

export const EXTERNAL_REQUIRED_KEYWORDS = [
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

export const LOCAL_SUFFICIENT_KEYWORDS = [
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

// ============================================================
// TYPES
// ============================================================

export type LegalVerifyMode =
  | "legal"
  | "procedure"
  | "roles"
  | "deadlines"
  | "definitions"
  | "jurisprudence";

export interface LegalCitation {
  title: string;
  url: string;
}

export interface LegalVerifyRequest {
  query: string;
  mode?: LegalVerifyMode;
  force_external?: boolean;
}

export interface LocalLegalMatch {
  code_name: string;
  article_number: string;
  relevance: number;
}

export interface GatekeeperDecision {
  needsExternal: boolean;
  reason: string;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Check if hostname matches or is subdomain of domain
 */
export function isHostMatch(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith("." + domain);
}

/**
 * Calculate relevance score between text and query
 */
export function calculateRelevance(
  text: string,
  query: string,
  keywords?: string[]
): number {
  const q = (query || "").toLowerCase();
  const t = (text || "").toLowerCase();
  const qWords = q
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3);

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

  const score = Math.min(1, hits * 0.12 + kwHits * 0.22);
  return score;
}

/**
 * Clamp confidence value to 0..1 range
 */
export function clampConfidence(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

/**
 * Deduplicate citations by URL
 */
export function uniqueCitations(
  citations: LegalCitation[],
  max: number
): LegalCitation[] {
  const seen = new Set<string>();
  const out: LegalCitation[] = [];

  for (const c of citations) {
    const url = String(c?.url || "").trim();
    if (!url) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ title: String(c?.title || "source"), url });
    if (out.length >= max) break;
  }

  return out;
}

/**
 * Gatekeeper: decide if external Perplexity call is needed
 */
export function shouldCallPerplexity(
  request: LegalVerifyRequest,
  localMatches: LocalLegalMatch[]
): GatekeeperDecision {
  const q = (request.query || "").toLowerCase();
  const mode = request.mode || "legal";

  // Force external
  if (request.force_external)
    return { needsExternal: true, reason: "force_external" };

  // Jurisprudence always external
  if (mode === "jurisprudence")
    return { needsExternal: true, reason: "jurisprudence" };

  // Check for external-requiring keywords
  for (const kw of EXTERNAL_REQUIRED_KEYWORDS) {
    if (q.includes(kw))
      return { needsExternal: true, reason: `external_keyword:${kw}` };
  }

  // Deadline precision requires external
  if (mode === "deadlines") {
    const patterns = ["exact", "précis", "combien", "jours", "quel délai"];
    if (patterns.some((p) => q.includes(p))) {
      return { needsExternal: true, reason: "deadline_precision" };
    }
  }

  // 2+ high relevance local matches -> local
  const high = localMatches.filter((m) => m.relevance >= 0.5);
  if (high.length >= 2)
    return { needsExternal: false, reason: "local>=2_high" };

  // Roles/definitions with any match -> local
  if ((mode === "roles" || mode === "definitions") && localMatches.length >= 1) {
    return { needsExternal: false, reason: "local_for_mode" };
  }

  // Any match -> local
  if (localMatches.length >= 1)
    return { needsExternal: false, reason: "local>=1" };

  // Check for local sufficient keywords without matches
  for (const kw of LOCAL_SUFFICIENT_KEYWORDS) {
    if (q.includes(kw)) {
      return { needsExternal: true, reason: `local_keyword_but_no_match:${kw}` };
    }
  }

  return { needsExternal: true, reason: "no_local_match" };
}
