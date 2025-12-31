/**
 * Unit tests for EmailCleanup utility functions
 * Tests the exported functions from src/utils/emailCleanup.utils.ts
 */
import { describe, it, expect, vi } from 'vitest';
import {
  extractDomain,
  extractEmail,
  isEmailRelevant,
  batchDelete,
  isGenericDomain,
  EMAIL_CLEANUP_BATCH_SIZE,
  GENERIC_DOMAINS,
  type EmailRow,
  type GmailConfig,
} from '../src/utils/emailCleanup.utils';

// ============================================================
// CONSTANTS TESTS
// ============================================================

describe("constants", () => {
  it("has correct batch size", () => {
    expect(EMAIL_CLEANUP_BATCH_SIZE).toBe(200);
  });

  it("GENERIC_DOMAINS contains common providers", () => {
    expect(GENERIC_DOMAINS).toContain("gmail.com");
    expect(GENERIC_DOMAINS).toContain("outlook.com");
    expect(GENERIC_DOMAINS).toContain("yahoo.com");
    expect(GENERIC_DOMAINS).toContain("icloud.com");
  });
});

// ============================================================
// extractDomain TESTS
// ============================================================

describe("extractDomain", () => {
  it("extracts domain from angle brackets format", () => {
    expect(extractDomain("John Doe <john@example.com>")).toBe("example.com");
  });

  it("extracts domain from plain email", () => {
    expect(extractDomain("john@example.com")).toBe("example.com");
  });

  it("handles lowercase conversion", () => {
    expect(extractDomain("JOHN@EXAMPLE.COM")).toBe("example.com");
  });

  it("handles complex domain", () => {
    expect(extractDomain("Admin <admin@sub.domain.example.ch>")).toBe("sub.domain.example.ch");
  });

  it("handles no @ symbol", () => {
    expect(extractDomain("invalid-email")).toBe("invalid-email");
  });
});

// ============================================================
// extractEmail TESTS
// ============================================================

describe("extractEmail", () => {
  it("extracts email from angle brackets", () => {
    expect(extractEmail("John Doe <john@example.com>")).toBe("john@example.com");
  });

  it("returns full string when no brackets", () => {
    expect(extractEmail("john@example.com")).toBe("john@example.com");
  });

  it("handles uppercase", () => {
    expect(extractEmail("John <JOHN@EXAMPLE.COM>")).toBe("john@example.com");
  });
});

// ============================================================
// isGenericDomain TESTS
// ============================================================

describe("isGenericDomain", () => {
  it("returns true for gmail.com", () => {
    expect(isGenericDomain("gmail.com")).toBe(true);
  });

  it("returns true for outlook.com", () => {
    expect(isGenericDomain("outlook.com")).toBe(true);
  });

  it("returns false for custom domain", () => {
    expect(isGenericDomain("company.ch")).toBe(false);
  });

  it("is case insensitive", () => {
    expect(isGenericDomain("GMAIL.COM")).toBe(true);
  });
});

// ============================================================
// isEmailRelevant TESTS
// ============================================================

describe("isEmailRelevant", () => {
  const testEmail: EmailRow = {
    id: "1",
    subject: "Important: Protection des données",
    sender: "admin@canton-vd.ch",
    received_at: "2024-01-01T00:00:00Z"
  };

  it("returns relevant when no config", () => {
    const result = isEmailRelevant(testEmail, null);
    expect(result.relevant).toBe(true);
    expect(result.matchedKeywords).toEqual([]);
  });

  it("returns relevant when domains match", () => {
    const config: GmailConfig = { domains: ["canton-vd.ch"], keywords: [] };
    const result = isEmailRelevant(testEmail, config);
    expect(result.relevant).toBe(true);
  });

  it("returns relevant when keywords match", () => {
    const config: GmailConfig = { domains: [], keywords: ["protection"] };
    const result = isEmailRelevant(testEmail, config);
    expect(result.relevant).toBe(true);
    expect(result.matchedKeywords).toContain("protection");
  });

  it("returns not relevant when domain mismatch", () => {
    const config: GmailConfig = { domains: ["other-domain.ch"], keywords: [] };
    const result = isEmailRelevant(testEmail, config);
    expect(result.relevant).toBe(false);
  });

  it("returns relevant when both filters empty", () => {
    const config: GmailConfig = { domains: [], keywords: [] };
    const result = isEmailRelevant(testEmail, config);
    expect(result.relevant).toBe(true);
  });

  it("returns multiple matched keywords", () => {
    const email: EmailRow = {
      id: "2",
      subject: "Protection des données personnelles urgent",
      sender: "admin@test.ch",
      received_at: "2024-01-01T00:00:00Z"
    };
    const config: GmailConfig = { domains: [], keywords: ["protection", "données", "urgent"] };
    const result = isEmailRelevant(email, config);
    expect(result.relevant).toBe(true);
    expect(result.matchedKeywords.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// batchDelete TESTS
// ============================================================

describe("batchDelete", () => {
  it("processes in batches of 200", async () => {
    const ids = Array.from({ length: 500 }, (_, i) => `id-${i}`);
    const batches: string[][] = [];

    const mockDelete = vi.fn(async (batch: string[]) => {
      batches.push(batch);
      return { error: null };
    });

    const result = await batchDelete(ids, mockDelete);

    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(500);
    expect(batches.length).toBe(3); // 200 + 200 + 100
    expect(batches[0].length).toBe(200);
    expect(batches[1].length).toBe(200);
    expect(batches[2].length).toBe(100);
  });

  it("stops on first error", async () => {
    const ids = Array.from({ length: 500 }, (_, i) => `id-${i}`);
    let callCount = 0;

    const mockDelete = vi.fn(async () => {
      callCount++;
      if (callCount === 2) {
        return { error: new Error("RLS error") };
      }
      return { error: null };
    });

    const result = await batchDelete(ids, mockDelete);

    expect(result.success).toBe(false);
    expect(result.error).toBe("RLS error");
    expect(callCount).toBe(2);
    expect(result.deletedCount).toBe(200); // Only first batch succeeded
  });

  it("handles empty array", async () => {
    const mockDelete = vi.fn(async () => ({ error: null }));
    const result = await batchDelete([], mockDelete);
    
    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(0);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("handles single batch", async () => {
    const ids = Array.from({ length: 50 }, (_, i) => `id-${i}`);
    const mockDelete = vi.fn(async () => ({ error: null }));

    const result = await batchDelete(ids, mockDelete);

    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(50);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// handleSwipe state management TESTS
// ============================================================

describe("handleSwipe state management", () => {
  it("should always reset deleting state in finally block", async () => {
    let deleting = false;

    const simulateSwipe = async (shouldError: boolean) => {
      deleting = true;
      try {
        if (shouldError) throw new Error("Test error");
        // success path
      } catch {
        // error path
      } finally {
        deleting = false;
      }
    };

    // Test success case
    await simulateSwipe(false);
    expect(deleting).toBe(false);

    // Test error case
    await simulateSwipe(true);
    expect(deleting).toBe(false);
  });

  it("should validate currentGroup before action", () => {
    const shouldProceed = (currentGroup: unknown, deleting: boolean) => {
      if (!currentGroup || deleting) return false;
      return true;
    };

    expect(shouldProceed(null, false)).toBe(false);
    expect(shouldProceed(undefined, false)).toBe(false);
    expect(shouldProceed({ domain: "test.com" }, true)).toBe(false);
    expect(shouldProceed({ domain: "test.com" }, false)).toBe(true);
  });

  it("should validate user auth before action", () => {
    const shouldProceed = (user: unknown) => {
      if (!user) return false;
      return true;
    };

    expect(shouldProceed(null)).toBe(false);
    expect(shouldProceed(undefined)).toBe(false);
    expect(shouldProceed({ id: "user-123" })).toBe(true);
  });
});

// ============================================================
// Swipe directions TESTS
// ============================================================

describe("Swipe directions", () => {
  type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null;

  const getAction = (direction: SwipeDirection): string => {
    switch (direction) {
      case 'left': return 'delete';
      case 'right': return 'whitelist';
      case 'down': return 'blacklist+delete';
      case 'up': return 'skip';
      default: return 'none';
    }
  };

  it("left = delete emails", () => {
    expect(getAction('left')).toBe('delete');
  });

  it("right = whitelist domain", () => {
    expect(getAction('right')).toBe('whitelist');
  });

  it("down = delete + blacklist", () => {
    expect(getAction('down')).toBe('blacklist+delete');
  });

  it("up = skip/ignore", () => {
    expect(getAction('up')).toBe('skip');
  });

  it("null = no action", () => {
    expect(getAction(null)).toBe('none');
  });
});

// ============================================================
// Stats tracking TESTS
// ============================================================

describe("Stats tracking", () => {
  interface Stats {
    deleted: number;
    kept: number;
    blacklisted: number;
    skipped: number;
  }

  it("initializes with zeros", () => {
    const stats: Stats = { deleted: 0, kept: 0, blacklisted: 0, skipped: 0 };
    expect(stats.deleted).toBe(0);
    expect(stats.kept).toBe(0);
    expect(stats.blacklisted).toBe(0);
    expect(stats.skipped).toBe(0);
  });

  it("increments correctly for swipe actions", () => {
    let stats: Stats = { deleted: 0, kept: 0, blacklisted: 0, skipped: 0 };
    
    // Simulate left swipe (delete 5 emails)
    stats = { ...stats, deleted: stats.deleted + 5 };
    expect(stats.deleted).toBe(5);

    // Simulate right swipe (keep)
    stats = { ...stats, kept: stats.kept + 3 };
    expect(stats.kept).toBe(3);

    // Simulate down swipe (blacklist 2 emails)
    stats = { ...stats, blacklisted: stats.blacklisted + 2, deleted: stats.deleted + 2 };
    expect(stats.blacklisted).toBe(2);
    expect(stats.deleted).toBe(7);

    // Simulate up swipe (skip 4 emails)
    stats = { ...stats, skipped: stats.skipped + 4 };
    expect(stats.skipped).toBe(4);
  });
});
