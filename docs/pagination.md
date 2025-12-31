# Pagination Module (Edge Functions)

## 1. Pourquoi un module Edge `_shared` existe

Les Edge Functions Supabase (Deno) ne peuvent pas importer depuis `/src/` (code frontend Node).
Pour éviter la duplication et garantir une source de vérité unique, la logique de pagination
est centralisée dans:

```
supabase/functions/_shared/paginatedFetch.ts
```

Ce module est **pur** (aucune dépendance Supabase, aucun import externe) et peut être
utilisé par toutes les Edge Functions qui nécessitent une pagination.

---

## 2. Signature et contrat

```typescript
type QueryPageResult = {
  data: unknown[] | null;
  error: Error | null;
};

function paginatedFetch(
  queryFactory: (offset: number, limit: number) => Promise<QueryPageResult>,
  batchSize: number,
  maxRows: number
): Promise<unknown[]>
```

### Contrat:
- **batchSize <= 0 ou maxRows <= 0** → retourne `[]` immédiatement
- **Première page vide** → retourne `[]`
- **Erreur dans queryFactory** → `throw error` immédiat (pas de swallow)
- **Page plus courte que batchSize** → arrête la pagination
- **Résultat final** → tronqué à `maxRows` éléments

---

## 3. Utilisation côté Edge (wrapper Supabase)

Dans une Edge Function, créer un wrapper qui construit le `queryFactory`:

```typescript
import { paginatedFetch as paginatedFetchPure } from "../_shared/paginatedFetch.ts";

async function paginatedFetchSupabase(
  supabase: any,
  table: string,
  selectCols: string,
  filters?: { column: string; value: any }[],
  batchSize = 500,
  maxRows = 2000
): Promise<unknown[]> {
  const queryFactory = async (offset: number, limit: number) => {
    const fromIndex = offset;
    const toIndex = offset + limit - 1;

    let q = supabase
      .from(table)
      .select(selectCols)
      .range(fromIndex, toIndex);

    if (filters && Array.isArray(filters)) {
      for (const f of filters) {
        q = q.eq(f.column, f.value);
      }
    }

    const res = await q;
    return {
      data: Array.isArray(res.data) ? res.data : [],
      error: res.error ? res.error : null,
    };
  };

  return await paginatedFetchPure(queryFactory, batchSize, maxRows);
}
```

### Appel:
```typescript
const rows = await paginatedFetchSupabase(
  supabase,
  "legal_articles",
  "code_name, article_number, article_text",
  [{ column: "is_current", value: true }],
  500,
  2000
);
```

---

## 4. Test côté frontend/tests (queryFactory mockée)

Les tests Vitest (Node) utilisent le module pur situé dans:
```
src/shared/pagination/paginatedFetch.ts
```

(copie identique du module Edge, compatible Node)

### Exemple de test:
```typescript
import { paginatedFetch } from "@/shared/pagination/paginatedFetch";

it("fetches multiple pages", async () => {
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
```

---

## Maintenance

- **Ne jamais importer `/src/` depuis une Edge Function**
- **Ne pas réintroduire de génériques TypeScript `<T>`** (Loveable peut casser les chevrons)
- **Une seule source de vérité Edge**: `supabase/functions/_shared/paginatedFetch.ts`
