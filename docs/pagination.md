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

## 5) Sécurité / Flags (legal-verify)

L'Edge Function `legal-verify` dispose de flags de contrôle pour activer des fonctionnalités de debug et maintenance.

**Flags disponibles (dans le body JSON):**

| Flag | Type | Défaut | Description |
|------|------|--------|-------------|
| `debug_pagination` | boolean | false | Active l'instrumentation pagination (batchSize=1, ranges, rowsFetched, stoppedBecause) |
| `debug_probes` | boolean | false | Active les probes diagnostiques (probeSansFiltre, probeAvecFiltre). **Requiert** debug_pagination=true |
| `seed_references` | boolean | false | Autorise le seed de `legal_references` si table vide. **Requiert** debug_pagination=true |

**Règles de sécurité:**

1. Par défaut, **tout est désactivé** (zéro effet de bord)
2. `debug_probes` et `seed_references` sont **ignorés** si `debug_pagination=false`
3. Le seed est **idempotent** (upsert avec onConflict sur code_name, article_number)
4. Les probes sont **read-only** (count exact head:true)

**Exemples de payloads:**

```json
// Mode normal (production) - aucun debug
{ "query": "LPD accès données", "mode": "legal" }

// Debug pagination seul (pas de probes, pas de seed)
{ "query": "LPD accès données", "mode": "legal", "debug_pagination": true }

// Debug avec probes activés
{ "query": "LPD accès données", "mode": "legal", "debug_pagination": true, "debug_probes": true }

// Debug avec seed activé (write DB autorisé)
{ "query": "LPD accès données", "mode": "legal", "debug_pagination": true, "seed_references": true }

// Debug complet (probes + seed)
{ "query": "LPD accès données", "mode": "legal", "debug_pagination": true, "debug_probes": true, "seed_references": true }
```

---

## Maintenance

- Ne jamais importer `src/` depuis une Edge Function
- Ne pas réintroduire de génériques TypeScript (Loveable peut casser les chevrons)
- Source de vérité Edge : `supabase/functions/_shared/paginatedFetch.ts`
