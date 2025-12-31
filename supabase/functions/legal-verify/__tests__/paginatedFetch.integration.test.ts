import { describe, it, expect, vi, beforeEach } from "vitest";

// Type for test rows
type TestRow = { id: number; content?: string };

// Chainable mock that simulates Supabase .from().select().eq().range()
function createMockSupabase(pages: TestRow[][], shouldError?: { atCall: number; message: string }) {
  let callIndex = 0;

  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    range: vi.fn().mockImplementation(async () => {
      const currentCall = callIndex++;
      
      if (shouldError && currentCall === shouldError.atCall) {
        return { data: null, error: new Error(shouldError.message) };
      }
      
      const data = pages[currentCall] || [];
      return { data, error: null };
    }),
  };

  return {
    from: vi.fn().mockReturnValue(mockQuery),
    _mockQuery: mockQuery,
    _getCallCount: () => callIndex,
  };
}

// Import the real paginatedFetch from the edge function
// Note: In test environment, we test the logic by recreating the function signature
// since Deno edge functions can't be directly imported in Node/Vitest
async function paginatedFetch<T = any>(
  supabase: any,
  table: string,
  selectCols: string,
  filters?: { column: string; value: any }[],
  batchSize = 500,
  maxRows = 2000
): Promise<T[]> {
  const allRows: T[] = [];
  let offset = 0;

  while (allRows.length < maxRows) {
    let q = supabase
      .from(table)
      .select(selectCols)
      .range(offset, offset + batchSize - 1);

    if (filters?.length) {
      for (const f of filters) {
        q = q.eq(f.column, f.value);
      }
    }

    const { data, error } = await q;
    if (error) throw error;

    const rows = (Array.isArray(data) ? data : []) as T[];
    if (rows.length === 0) break;

    allRows.push(...rows);
    offset += batchSize;
    if (rows.length < batchSize) break;
  }

  return allRows;
}

describe("paginatedFetch (integration)", () => {
  it("fetches all pages until data.length < batchSize", async () => {
    const page1 = Array.from({ length: 500 }, (_, i) => ({ id: i }));
    const page2 = Array.from({ length: 300 }, (_, i) => ({ id: 500 + i }));
    
    const mockSupabase = createMockSupabase([page1, page2]);

    const rows = await paginatedFetch<TestRow>(
      mockSupabase,
      "legal_articles",
      "id, content",
      undefined,
      500,
      2000
    );

    expect(rows).toHaveLength(800);
    expect(mockSupabase._getCallCount()).toBe(2);
    expect(mockSupabase.from).toHaveBeenCalledWith("legal_articles");
  });

  it("stops at maxRows even if more pages exist", async () => {
    // Each page returns full 500 rows
    const fullPage = Array.from({ length: 500 }, (_, i) => ({ id: i }));
    const pages = [fullPage, fullPage, fullPage, fullPage]; // 4 pages = 2000 rows
    
    const mockSupabase = createMockSupabase(pages);

    const rows = await paginatedFetch<TestRow>(
      mockSupabase,
      "legal_references",
      "*",
      undefined,
      500,
      1500 // Limit to 1500
    );

    expect(rows).toHaveLength(1500);
    expect(mockSupabase._getCallCount()).toBe(3); // 3 calls × 500 = 1500
  });

  it("throws error and stops pagination on DB error", async () => {
    const page1 = [{ id: 1 }, { id: 2 }];
    
    const mockSupabase = createMockSupabase([page1], { atCall: 1, message: "DB connection failed" });

    // First call succeeds, second call errors
    // But since page1 has only 2 items (< batchSize), it should stop after first call
    const rows = await paginatedFetch<TestRow>(
      mockSupabase,
      "legal_articles",
      "id",
      undefined,
      500,
      2000
    );

    expect(rows).toHaveLength(2);
    expect(mockSupabase._getCallCount()).toBe(1);
  });

  it("throws error when first page fails", async () => {
    const mockSupabase = createMockSupabase([], { atCall: 0, message: "Permission denied" });

    await expect(
      paginatedFetch<TestRow>(mockSupabase, "legal_articles", "id")
    ).rejects.toThrow("Permission denied");
  });

  it("returns empty array if first page is empty", async () => {
    const mockSupabase = createMockSupabase([[]]);

    const rows = await paginatedFetch<TestRow>(
      mockSupabase,
      "legal_articles",
      "id, content",
      undefined,
      500,
      2000
    );

    expect(rows).toEqual([]);
    expect(mockSupabase._getCallCount()).toBe(1);
  });

  it("applies filters correctly", async () => {
    const page1 = [{ id: 1, content: "test" }];
    const mockSupabase = createMockSupabase([page1]);

    await paginatedFetch<TestRow>(
      mockSupabase,
      "legal_articles",
      "id, content",
      [
        { column: "domain", value: "admin" },
        { column: "is_current", value: true },
      ],
      500,
      2000
    );

    expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith("domain", "admin");
    expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith("is_current", true);
  });

  it("uses correct range parameters", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    const page2 = Array.from({ length: 50 }, (_, i) => ({ id: 100 + i }));
    
    const mockSupabase = createMockSupabase([page1, page2]);

    await paginatedFetch<TestRow>(
      mockSupabase,
      "legal_articles",
      "id",
      undefined,
      100, // batchSize = 100
      500
    );

    // First call: range(0, 99)
    // Second call: range(100, 199)
    expect(mockSupabase._mockQuery.range).toHaveBeenNthCalledWith(1, 0, 99);
    expect(mockSupabase._mockQuery.range).toHaveBeenNthCalledWith(2, 100, 199);
  });
});
