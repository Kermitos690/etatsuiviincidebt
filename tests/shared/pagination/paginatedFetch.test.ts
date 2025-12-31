import { describe, it, expect } from "vitest";
import { paginatedFetch } from "@/shared/pagination/paginatedFetch";

describe("paginatedFetch", () => {
  it("returns empty array when batchSize is invalid", async () => {
    const result = await paginatedFetch(
      async () => ({ data: [1, 2, 3], error: null }),
      0,
      10
    );
    expect(result).toEqual([]);
  });

  it("returns empty array when maxRows is invalid", async () => {
    const result = await paginatedFetch(
      async () => ({ data: [1, 2, 3], error: null }),
      5,
      0
    );
    expect(result).toEqual([]);
  });

  it("fetches a single page and stops", async () => {
    const result = await paginatedFetch(
      async () => ({ data: [1, 2, 3], error: null }),
      10,
      50
    );
    expect(result).toEqual([1, 2, 3]);
  });

  it("fetches multiple pages until last page is shorter", async () => {
    let call = 0;

    const result = await paginatedFetch(
      async () => {
        call = call + 1;
        if (call === 1) return { data: [1, 2], error: null };
        if (call === 2) return { data: [3], error: null };
        return { data: [], error: null };
      },
      2,
      10
    );

    expect(result).toEqual([1, 2, 3]);
  });

  it("stops when maxRows is reached", async () => {
    let call = 0;

    const result = await paginatedFetch(
      async () => {
        call = call + 1;
        return { data: [call], error: null };
      },
      1,
      3
    );

    expect(result).toEqual([1, 2, 3]);
  });

  it("throws when queryFactory returns error", async () => {
    let call = 0;

    await expect(
      paginatedFetch(
        async () => {
          call = call + 1;
          if (call === 2) return { data: null, error: new Error("boom") };
          return { data: [1], error: null };
        },
        1,
        10
      )
    ).rejects.toThrow("boom");
  });

  it("returns empty array when first page is empty", async () => {
    const result = await paginatedFetch(
      async () => ({ data: [], error: null }),
      5,
      10
    );
    expect(result).toEqual([]);
  });
});
