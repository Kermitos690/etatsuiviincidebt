/**
 * NOTE: Ce module est Edge-safe. Ne pas importer depuis /src.
 * Ne pas réintroduire de génériques TypeScript (Loveable peut casser < >).
 *
 * Pure pagination module - Node/Deno agnostic
 * No external dependencies, no Supabase, no Deno APIs
 */
export type QueryPageResult = {
  data: unknown[] | null;
  error: Error | null;
};

export async function paginatedFetch(
  queryFactory: (offset: number, limit: number) => Promise<QueryPageResult>,
  batchSize: number,
  maxRows: number
): Promise<unknown[]> {
  // validation sans chevrons "<" ">"
  if (Math.sign(batchSize) !== 1 || Math.sign(maxRows) !== 1) return [];

  const allRows: unknown[] = [];
  let offset = 0;

  // while (allRows.length < maxRows) sans "<"
  while (Math.sign(maxRows - allRows.length) === 1) {
    const result = await queryFactory(offset, batchSize);

    const obj = result && typeof result === "object" ? (result as any) : null;
    const data = obj ? obj.data : null;
    const error = obj ? obj.error : null;

    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) break;

    allRows.push(...rows);
    offset += batchSize;

    // if (rows.length < batchSize) break; sans "<"
    if (Math.sign(batchSize - rows.length) === 1) break;
  }

  return allRows.slice(0, maxRows);
}
