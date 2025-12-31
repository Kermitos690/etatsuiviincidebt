/**
 * Unit tests for legal-verify utility functions
 * Tests the exported functions from src/utils/legalVerify.utils.ts
 */
import { describe, it, expect, vi } from 'vitest';
import {
  isHostMatch,
  calculateRelevance,
  clampConfidence,
  uniqueCitations,
  shouldCallPerplexity,
  paginatedFetch,
  LEGAL_VERIFY_BATCH_SIZE,
  LEGAL_VERIFY_MAX_ROWS,
  CACHE_TTL_DAYS,
  type LegalCitation,
  type LocalLegalMatch,
} from '../src/utils/legalVerify.utils';

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
    const score = calculateRelevance("protection des données personnelles", "données personnelles", []);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("increases score for keyword matches", () => {
    const score = calculateRelevance("article sur lpd", "protection lpd", ["lpd"]);
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
});

// ============================================================
// shouldCallPerplexity TESTS
// ============================================================

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
// paginatedFetch TESTS
// ============================================================

describe("paginatedFetch", () => {
  it("paginates until last page (data < batchSize)", async () => {
    const pages = [
      Array.from({ length: 500 }, (_, i) => ({ id: i })),
      Array.from({ length: 300 }, (_, i) => ({ id: 500 + i })),
    ];
    let callIndex = 0;

    const fetchPage = vi.fn(async () => {
      const data = pages[callIndex] ?? [];
      callIndex++;
      return { data, error: null };
    });

    const data = await paginatedFetch<{ id: number }>(fetchPage, 500, 2000);

    expect(data).toHaveLength(800);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("stops when reaching maxRows", async () => {
    // Create pages that would exceed maxRows
    const fetchPage = vi.fn(async () => ({
      data: Array.from({ length: 500 }, (_, i) => ({ id: i })),
      error: null
    }));

    const data = await paginatedFetch<{ id: number }>(fetchPage, 500, 1500);

    // Should stop at 1500 even though pages have 500 each
    expect(data.length).toBeLessThanOrEqual(1500);
    expect(fetchPage).toHaveBeenCalledTimes(3); // 500 + 500 + 500 = 1500
  });

  it("stops on error", async () => {
    let callCount = 0;
    const fetchPage = vi.fn(async () => {
      callCount++;
      if (callCount === 2) {
        return { data: null, error: new Error("DB error") };
      }
      return { data: [{ id: 1 }], error: null };
    });

    const data = await paginatedFetch<{ id: number }>(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(data).toHaveLength(1); // Only first page
  });

  it("handles empty first page", async () => {
    const fetchPage = vi.fn(async () => ({
      data: [],
      error: null
    }));

    const data = await paginatedFetch<{ id: number }>(fetchPage);

    expect(data).toHaveLength(0);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
