# Pagination Module (Edge Functions)

## 1) Pourquoi un module Edge `_shared` existe

Les Edge Functions (Deno) ne doivent pas importer depuis `src/` (code frontend/tests).
Pour éviter la duplication et garder une source de vérité unique, la logique de pagination Edge est dans :

- `supabase/functions/_shared/paginatedFetch.ts`

Ce module est **pur** :
- aucun import Supabase
- aucun import externe
- compatible Edge (Deno)

---

## 2) Signature et contrat

Types :

- QueryPageResult :
  - data: unknown[] ou null
  - error: Error ou null

Fonction :

- paginatedFetch(queryFactory, batchSize, maxRows) retourne une Promise qui résout vers unknown[]

Contrat :

- batchSize <= 0 OU maxRows <= 0 : retourne [] immédiatement
- première page vide : retourne []
- si queryFactory renvoie une erreur : throw error immédiat
- si une page contient moins d'éléments que batchSize : arrêt de la pagination
- résultat final : tronqué à maxRows éléments

---

## 3) Utilisation côté Edge (wrapper Supabase-like)

Dans une Edge Function, créer un wrapper qui construit queryFactory (offset, limit).
Le wrapper :
- calcule fromIndex = offset
- calcule toIndex = offset + limit - 1
- applique range(fromIndex, toIndex)
- applique les filtres via eq(column, value)
- retourne { data, error } puis délègue à paginatedFetchPure

Note :
- Le wrapper reste dans l'Edge Function
- La pagination pure reste dans `_shared/paginatedFetch.ts`

---

## 4) Tests côté frontend (Vitest / Node)

Les tests Node utilisent le module pur côté frontend :

- `src/shared/pagination/paginatedFetch.ts`

Les tests simulent queryFactory avec des retours de pages, sans importer de code Edge.

---

## Maintenance

- Ne jamais importer `src/` depuis une Edge Function
- Ne pas réintroduire de génériques TypeScript (Loveable peut casser les chevrons)
- Source de vérité Edge : `supabase/functions/_shared/paginatedFetch.ts`
