/**
 * Pure pagination module - Node/Deno agnostic
 * No external dependencies, no Supabase, no Deno APIs
 */

export type QueryPageResult = {
  data: unknown[] | null;
  error: Error | null;
};

type AsyncQueryFactory = (offset: number, limit: number) => PromiseLike<QueryPageResult>;

export async function paginatedFetch(
  queryFactory: AsyncQueryFactory,
  batchSize: number,
  maxRows: number
) {
  if (batchSize <= 0 || maxRows <= 0) return [] as unknown[];

  const allRows: unknown[] = [];
  let offset = 0;

  while (maxRows - allRows.length > 0) {
    const result = await queryFactory(offset, batchSize);

    const data = result && typeof result === "object" ? (result as QueryPageResult).data : null;
    const error = result && typeof result === "object" ? (result as QueryPageResult).error : null;

    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) break;

    allRows.push(...rows);
    offset += batchSize;

    if (batchSize - rows.length > 0) break;
  }

  return allRows.slice(0, maxRows);
}
