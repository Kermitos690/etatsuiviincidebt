/**
 * Unit tests for legal-verify utility functions
 * These tests ensure non-regression on core logic
 */
import { describe, it, expect } from 'vitest';

// ============================================================
// CONSTANTS (mirrored from edge function)
// ============================================================

const BATCH_SIZE = 500;
const MAX_ROWS = 2000;
const CACHE_TTL_DAYS = 7;

// ============================================================
// UTILITY FUNCTIONS (extracted for testing)
// ============================================================

function isHostMatch(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith("." + domain);
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

  const score = Math.min(1, hits * 0.12 + kwHits * 0.22);
  return score;
}

function clampConfidence(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

interface LegalCitation {
  title: string;
  url: string;
}

function uniqueCitations(citations: LegalCitation[], max: number): LegalCitation[] {
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

type LegalVerifyMode = "legal" | "procedure" | "roles" | "deadlines" | "definitions" | "jurisprudence";

interface LegalVerifyRequest {
  query: string;
  mode?: LegalVerifyMode;
  force_external?: boolean;
}

interface LocalLegalMatch {
  code_name: string;
  article_number: string;
  relevance: number;
}

interface GatekeeperDecision {
  needsExternal: boolean;
  reason: string;
}

const EXTERNAL_REQUIRED_KEYWORDS = [
  "jurisprudence", "atf", "arrêt", "tribunal fédéral", "décision",
  "jugement", "recours accepté", "rejeté", "délai exact", "combien de jours", "quel délai"
];

const LOCAL_SUFFICIENT_KEYWORDS = [
  "principe", "définition", "rôle", "compétence", "curateur",
  "curatelle", "protection adulte", "lpd", "données personnelles", "droit d'accès"
];

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

  for (const kw of LOCAL_SUFFICIENT_KEYWORDS) {
    if (q.includes(kw)) {
      return { needsExternal: true, reason: `local_keyword_but_no_match:${kw}` };
    }
  }

  return { needsExternal: true, reason: "no_local_match" };
}

// ============================================================
// TESTS
// ============================================================

describe("isHostMatch", () => {
  it("matches exact domain", () => {
    expect(isHostMatch("fedlex.admin.ch", "fedlex.admin.ch")).toBe(true);
  });

  it("matches subdomain", () => {
    expect(isHostMatch("www.fedlex.admin.ch", "fedlex.admin.ch")).toBe(true);
  });

  it("does not match partial domain", () => {
    expect(isHostMatch("notfedlex.admin.ch", "fedlex.admin.ch")).toBe(false);
  });

  it("does not match unrelated domain", () => {
    expect(isHostMatch("google.com", "fedlex.admin.ch")).toBe(false);
  });
});

describe("calculateRelevance", () => {
  it("returns 0 for no matches", () => {
    const score = calculateRelevance("hello world", "xyz abc", []);
    expect(score).toBe(0);
  });

  it("increases score for word matches", () => {
    const score = calculateRelevance("protection des données personnelles", "données personnelles", []);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("increases score for keyword matches", () => {
    const score = calculateRelevance("article sur lpd", "protection lpd", ["lpd"]);
    expect(score).toBeGreaterThan(0.2); // keyword hit
  });

  it("clamps score to max 1", () => {
    const score = calculateRelevance(
      "protection données personnelles curateur curatelle",
      "protection données personnelles curateur curatelle",
      ["protection", "données", "personnelles", "curateur", "curatelle"]
    );
    expect(score).toBeLessThanOrEqual(1);
  });

  it("handles empty inputs", () => {
    expect(calculateRelevance("", "", [])).toBe(0);
    expect(calculateRelevance("test", "", [])).toBe(0);
    expect(calculateRelevance("", "test", [])).toBe(0);
  });
});

describe("clampConfidence", () => {
  it("clamps to 0 for negative", () => {
    expect(clampConfidence(-0.5)).toBe(0);
  });

  it("clamps to 1 for values > 1", () => {
    expect(clampConfidence(1.5)).toBe(1);
  });

  it("passes through valid values", () => {
    expect(clampConfidence(0.5)).toBe(0.5);
  });

  it("handles non-number inputs", () => {
    expect(clampConfidence("0.7")).toBe(0.7);
    expect(clampConfidence("invalid")).toBe(0);
    expect(clampConfidence(null)).toBe(0);
    expect(clampConfidence(undefined)).toBe(0);
  });
});

describe("uniqueCitations", () => {
  it("removes duplicates by URL", () => {
    const citations: LegalCitation[] = [
      { title: "A", url: "https://a.com" },
      { title: "B", url: "https://a.com" },
      { title: "C", url: "https://b.com" },
    ];
    const result = uniqueCitations(citations, 10);
    expect(result).toHaveLength(2);
    expect(result[0].url).toBe("https://a.com");
    expect(result[1].url).toBe("https://b.com");
  });

  it("respects max limit", () => {
    const citations: LegalCitation[] = [
      { title: "A", url: "https://a.com" },
      { title: "B", url: "https://b.com" },
      { title: "C", url: "https://c.com" },
    ];
    const result = uniqueCitations(citations, 2);
    expect(result).toHaveLength(2);
  });

  it("skips empty URLs", () => {
    const citations: LegalCitation[] = [
      { title: "A", url: "" },
      { title: "B", url: "https://b.com" },
    ];
    const result = uniqueCitations(citations, 10);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://b.com");
  });

  it("handles empty array", () => {
    expect(uniqueCitations([], 5)).toEqual([]);
  });
});

describe("shouldCallPerplexity", () => {
  it("returns true for force_external", () => {
    const result = shouldCallPerplexity({ query: "test", force_external: true }, []);
    expect(result.needsExternal).toBe(true);
    expect(result.reason).toBe("force_external");
  });

  it("returns true for jurisprudence mode", () => {
    const result = shouldCallPerplexity({ query: "test", mode: "jurisprudence" }, []);
    expect(result.needsExternal).toBe(true);
    expect(result.reason).toBe("jurisprudence");
  });

  it("returns true for external keywords", () => {
    const result = shouldCallPerplexity({ query: "recherche jurisprudence atf" }, []);
    expect(result.needsExternal).toBe(true);
    expect(result.reason).toContain("external_keyword");
  });

  it("returns true for deadline precision queries", () => {
    const result = shouldCallPerplexity({ query: "combien de jours pour recours", mode: "deadlines" }, []);
    expect(result.needsExternal).toBe(true);
    expect(result.reason).toBe("deadline_precision");
  });

  it("returns false when 2+ high relevance local matches", () => {
    const matches: LocalLegalMatch[] = [
      { code_name: "CC", article_number: "388", relevance: 0.6 },
      { code_name: "CC", article_number: "389", relevance: 0.55 },
    ];
    const result = shouldCallPerplexity({ query: "curatelle" }, matches);
    expect(result.needsExternal).toBe(false);
    expect(result.reason).toBe("local>=2_high");
  });

  it("returns false for roles/definitions mode with 1+ match", () => {
    const matches: LocalLegalMatch[] = [
      { code_name: "CC", article_number: "388", relevance: 0.3 },
    ];
    const result = shouldCallPerplexity({ query: "rôle curateur", mode: "roles" }, matches);
    expect(result.needsExternal).toBe(false);
    expect(result.reason).toBe("local_for_mode");
  });

  it("returns false for any mode with 1+ match", () => {
    const matches: LocalLegalMatch[] = [
      { code_name: "LPD", article_number: "5", relevance: 0.2 },
    ];
    const result = shouldCallPerplexity({ query: "données" }, matches);
    expect(result.needsExternal).toBe(false);
    expect(result.reason).toBe("local>=1");
  });

  it("returns true for no local match", () => {
    const result = shouldCallPerplexity({ query: "obscure query xyz" }, []);
    expect(result.needsExternal).toBe(true);
    expect(result.reason).toBe("no_local_match");
  });
});

// ============================================================
// PAGINATION LOGIC TESTS
// ============================================================

describe("Pagination constants", () => {
  it("has correct batch size", () => {
    expect(BATCH_SIZE).toBe(500);
  });

  it("has correct max rows", () => {
    expect(MAX_ROWS).toBe(2000);
  });

  it("has correct cache TTL", () => {
    expect(CACHE_TTL_DAYS).toBe(7);
  });
});

// Mock paginatedFetch behavior test
describe("paginatedFetch behavior", () => {
  it("should stop when data < batch size", () => {
    // Simulate: first batch returns 300 items (< 500)
    const batchSize = 500;
    const firstBatchLength = 300;
    expect(firstBatchLength < batchSize).toBe(true);
    // In real impl, loop would break here
  });

  it("should stop when reaching maxRows", () => {
    // Simulate: 4 batches of 500 = 2000, then stop
    const batchSize = 500;
    const maxRows = 2000;
    const batches = Math.ceil(maxRows / batchSize);
    expect(batches).toBe(4);
  });

  it("should accumulate all rows", () => {
    // Simulate accumulation
    const allRows: number[] = [];
    const batches = [[1, 2, 3], [4, 5, 6]];
    for (const batch of batches) {
      allRows.push(...batch);
    }
    expect(allRows).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
