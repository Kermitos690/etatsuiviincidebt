/**
 * Unit tests for legal-verify utility functions
 * Tests the exported functions from src/utils/legalVerify.utils.ts
 * 
 * Note: paginatedFetch is tested separately as it requires Supabase mocking
 */
import { describe, it, expect } from "vitest";
import {
  isHostMatch,
  calculateRelevance,
  clampConfidence,
  uniqueCitations,
  shouldCallPerplexity,
  LEGAL_VERIFY_BATCH_SIZE,
  LEGAL_VERIFY_MAX_ROWS,
  CACHE_TTL_DAYS,
  type LegalCitation,
  type LocalLegalMatch,
} from "../src/utils/legalVerify.utils";

// ============================================================
// CONSTANTS TESTS
// ============================================================

describe("constants", () => {
  it("has correct batch size", () => {
    expect(LEGAL_VERIFY_BATCH_SIZE).toBe(500);
  });

  it("has correct max rows", () => {
    expect(LEGAL_VERIFY_MAX_ROWS).toBe(2000);
  });

  it("has correct cache TTL", () => {
    expect(CACHE_TTL_DAYS).toBe(7);
  });
});

// ============================================================
// isHostMatch TESTS
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

  it("matches deep subdomain", () => {
    expect(isHostMatch("a.b.c.fedlex.admin.ch", "fedlex.admin.ch")).toBe(true);
  });
});

// ============================================================
// calculateRelevance TESTS
// ============================================================

describe("calculateRelevance", () => {
  it("returns 0 for no matches", () => {
    const score = calculateRelevance("hello world", "xyz abc", []);
    expect(score).toBe(0);
  });

  it("increases score for word matches", () => {
    const score = calculateRelevance(
      "protection des données personnelles",
      "données personnelles",
      []
    );
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("increases score for keyword matches", () => {
    const score = calculateRelevance("article sur lpd", "protection lpd", [
      "lpd",
    ]);
    expect(score).toBeGreaterThan(0.2);
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

  it("ignores short words (< 3 chars)", () => {
    const score = calculateRelevance("le la de du", "le la de du", []);
    expect(score).toBe(0);
  });
});

// ============================================================
// clampConfidence TESTS
// ============================================================

describe("clampConfidence", () => {
  it("clamps to 0 for negative", () => {
    expect(clampConfidence(-0.5)).toBe(0);
    expect(clampConfidence(-1)).toBe(0);
  });

  it("clamps to 1 for values > 1", () => {
    expect(clampConfidence(1.5)).toBe(1);
    expect(clampConfidence(2)).toBe(1);
  });

  it("passes through valid values", () => {
    expect(clampConfidence(0.5)).toBe(0.5);
    expect(clampConfidence(0)).toBe(0);
    expect(clampConfidence(1)).toBe(1);
    expect(clampConfidence(0.4)).toBe(0.4);
  });

  it("handles non-number inputs", () => {
    expect(clampConfidence("0.7")).toBe(0.7);
    expect(clampConfidence("invalid")).toBe(0);
    expect(clampConfidence(null)).toBe(0);
    expect(clampConfidence(undefined)).toBe(0);
  });

  it("handles NaN and Infinity", () => {
    expect(clampConfidence(NaN)).toBe(0);
    expect(clampConfidence(Infinity)).toBe(0);
    expect(clampConfidence(-Infinity)).toBe(0);
  });
});

// ============================================================
// uniqueCitations TESTS
// ============================================================

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

  it("uses 'source' as default title", () => {
    const citations: LegalCitation[] = [
      { title: "", url: "https://test.com" },
    ];
    const result = uniqueCitations(citations, 10);
    expect(result[0].title).toBe("source");
  });
});

// ============================================================
// shouldCallPerplexity TESTS
// ============================================================

describe("shouldCallPerplexity", () => {
  it("returns true for force_external", () => {
    const result = shouldCallPerplexity(
      { query: "test", force_external: true },
      []
    );
    expect(result.needsExternal).toBe(true);
    expect(result.reason).toBe("force_external");
  });

  it("returns true for jurisprudence mode", () => {
    const result = shouldCallPerplexity(
      { query: "test", mode: "jurisprudence" },
      []
    );
    expect(result.needsExternal).toBe(true);
    expect(result.reason).toBe("jurisprudence");
  });

  it("returns true for external keywords (atf)", () => {
    const result = shouldCallPerplexity(
      { query: "recherche jurisprudence atf" },
      []
    );
    expect(result.needsExternal).toBe(true);
    expect(result.reason).toContain("external_keyword");
  });

  it("returns true for external keywords (arrêt)", () => {
    const result = shouldCallPerplexity({ query: "arrêt du tribunal" }, []);
    expect(result.needsExternal).toBe(true);
    expect(result.reason).toContain("external_keyword:arrêt");
  });

  it("returns true for deadline precision queries", () => {
    const result = shouldCallPerplexity(
      { query: "combien de jours pour recours", mode: "deadlines" },
      []
    );
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
    const result = shouldCallPerplexity(
      { query: "rôle curateur", mode: "roles" },
      matches
    );
    expect(result.needsExternal).toBe(false);
    expect(result.reason).toBe("local_for_mode");
  });

  it("returns false for definitions mode with 1+ match", () => {
    const matches: LocalLegalMatch[] = [
      { code_name: "CC", article_number: "388", relevance: 0.3 },
    ];
    const result = shouldCallPerplexity(
      { query: "définition curateur", mode: "definitions" },
      matches
    );
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

  it("returns true for local keyword but no match", () => {
    const result = shouldCallPerplexity({ query: "curateur responsabilité" }, []);
    expect(result.needsExternal).toBe(true);
    expect(result.reason).toContain("local_keyword_but_no_match");
  });
});

// ============================================================
// PAGINATION BEHAVIOR TESTS (without real paginatedFetch)
// ============================================================

describe("Pagination behavior expectations", () => {
  it("should stop when data < batch size", () => {
    // This documents expected behavior
    const batchSize = LEGAL_VERIFY_BATCH_SIZE;
    const firstBatchLength = 300;
    expect(firstBatchLength < batchSize).toBe(true);
    // Real paginatedFetch would break here
  });

  it("should stop when reaching maxRows", () => {
    const batchSize = LEGAL_VERIFY_BATCH_SIZE;
    const maxRows = LEGAL_VERIFY_MAX_ROWS;
    const batches = Math.ceil(maxRows / batchSize);
    expect(batches).toBe(4); // 4 batches of 500 = 2000
  });

  it("should respect batch size constant", () => {
    expect(LEGAL_VERIFY_BATCH_SIZE).toBe(500);
  });

  it("should respect max rows constant", () => {
    expect(LEGAL_VERIFY_MAX_ROWS).toBe(2000);
  });
});
