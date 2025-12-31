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

## 5) Debug Flags (legal-verify)

L'Edge Function `legal-verify` dispose de flags de contrôle pour activer des fonctionnalités de debug et maintenance.

### Tableau des flags

| Flag | Type | Défaut | Description |
|------|------|--------|-------------|
| `debug_pagination` | boolean | false | Active l'instrumentation pagination (batchSize, ranges, rowsFetched, stoppedBecause) |
| `debug_probes` | boolean | false | Active les probes diagnostiques (probeSansFiltre, probeAvecFiltre). **Requiert** debug_pagination=true |
| `seed_references` | boolean | false | Autorise le seed de `legal_references` si table vide. **Requiert** debug_pagination=true |

### Règles de sécurité

1. Par défaut, **tout est désactivé** (zéro effet de bord)
2. `debug_probes` et `seed_references` sont **ignorés** si `debug_pagination=false`
3. Le seed est **idempotent** (upsert avec onConflict sur code_name, article_number)
4. Les probes sont **read-only** (count exact head:true)
5. Aucune donnée PII n'est loggée (pas de query complète, pas de contenu row)

### Anti-abus (best-effort, serverless)

Les protections anti-abus sont implémentées en mémoire et fournissent une protection de base :

| Protection | Limite | Comportement si dépassé |
|------------|--------|-------------------------|
| **Debug rate limit** | 5 requêtes/minute par IP | Réponse `source="degraded"` avec `debug.rate_limited=true` |
| **Seed cooldown** | 1 exécution/10 minutes (global) | `debug.seed.references.reason="cooldown_active"` sans exécution |

**Limitations serverless** : Ces protections sont best-effort. En environnement serverless (cold starts fréquents), les compteurs peuvent être réinitialisés. Cela offre une protection suffisante contre les abus accidentels mais ne constitue pas une sécurité absolue.

### Structure de la réponse debug

Quand `debug_pagination=true`, la réponse inclut :

```json
{
  "debug": {
    "debug_version": 1,
    "pagination": {
      "articles": { "enabled": true, "batchSize": 1, "calls": 65, "rowsFetched": 64, "stoppedBecause": "empty_page", ... },
      "references": { "enabled": true, "batchSize": 1, "calls": 16, "rowsFetched": 15, "stoppedBecause": "empty_page", ... }
    },
    "probes": {
      "articles": { "probeSansFiltre": 64, "probeAvecFiltre": 64 },
      "references": { "probeSansFiltre": 15, "probeAvecFiltre": 15 }
    },
    "seed": {
      "references": { "seeded": false, "inserted": 0, "reason": "already_has_rows" }
    }
  }
}
```

- `probes` n'apparaît **QUE** si `debug_probes=true`
- `seed` n'apparaît **QUE** si `seed_references=true`

### Exemples de payloads

**1) Mode normal (production) - aucun debug**
```json
{ "query": "LPD accès données", "mode": "legal" }
```
→ Pas de champ `debug` dans la réponse

**2) Debug pagination seul**
```json
{ "query": "LPD accès données", "mode": "legal", "debug_pagination": true }
```
→ `debug.pagination` présent, pas de `probes`, pas de `seed`

**3) Debug avec probes activés**
```json
{ "query": "LPD accès données", "mode": "legal", "debug_pagination": true, "debug_probes": true }
```
→ `debug.pagination` + `debug.probes` présents, pas de `seed`

**4) Debug avec seed activé**
```json
{ "query": "LPD accès données", "mode": "legal", "debug_pagination": true, "seed_references": true }
```
→ `debug.pagination` + `debug.seed` présents, pas de `probes`

**5) Debug complet**
```json
{ "query": "LPD accès données", "mode": "legal", "debug_pagination": true, "debug_probes": true, "seed_references": true }
```
→ `debug.pagination` + `debug.probes` + `debug.seed` tous présents

---

## Maintenance

- Ne jamais importer `src/` depuis une Edge Function
- Ne pas réintroduire de génériques TypeScript (Loveable peut casser les chevrons)
- Source de vérité Edge : `supabase/functions/_shared/paginatedFetch.ts`
- Debug doit rester 100% opt-in : aucun effet si `debug_pagination=false`
