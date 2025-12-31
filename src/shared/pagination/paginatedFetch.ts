/**
 * Pure pagination module - Node/Deno agnostic
 * No external dependencies, no Supabase, no Deno APIs
 */

export type QueryPageResult<T> = {
  data: T[] | null;
  error: Error | null;
};

export async function paginatedFetch<T>(
  queryFactory: (offset: number, limit: number) => Promise<QueryPageResult<T>>,
  batchSize: number,
  maxRows: number
): Promise<T[]> {
  if (batchSize <= 0 || maxRows <= 0) return [];

  const allRows: T[] = [];
  let offset = 0;

  while (allRows.length < maxRows) {
    const { data, error } = await queryFactory(offset, batchSize);

    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) break;

    allRows.push(...rows);
    offset += batchSize;

    if (rows.length < batchSize) break;
  }

  return allRows.slice(0, maxRows);
}
