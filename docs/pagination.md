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
| `debug_persist` | boolean | false | Active le rate-limit/cooldown durable (DB) au lieu de mémoire. **Requiert** debug_pagination=true |
| `debug_probes` | boolean | false | Active les probes diagnostiques (probeSansFiltre, probeAvecFiltre). **Requiert** debug_pagination=true |
| `seed_references` | boolean | false | Autorise le seed de `legal_references` si table vide. **Requiert** debug_pagination=true |
| `seed_cooldown_probe` | boolean | false | Test du cooldown sans écrire. **Requiert** debug_pagination=true ET seed_references=true |
| `self_test_debug` | boolean | false | Exécute un auto-test interne (6 rate-limits + 2 cooldowns). **Requiert** debug_pagination=true ET debug_persist=true |

### Règles de sécurité

1. Par défaut, **tout est désactivé** (zéro effet de bord)
2. `debug_probes`, `seed_references` et `debug_persist` sont **ignorés** si `debug_pagination=false`
3. Le seed est **idempotent** (upsert avec onConflict sur code_name, article_number)
4. Les probes sont **read-only** (count exact head:true)
5. Aucune donnée PII n'est loggée (pas de query complète, pas de contenu row)
6. En mode persist, les IP sont hashées avec un salt (pas d'IP en clair stockée)

### Anti-abus

Les protections anti-abus sont disponibles en deux modes :

| Mode | Stockage | Fiabilité | Activation |
|------|----------|-----------|------------|
| **memory** (défaut) | RAM process | Best-effort (cold starts réinitialisent) | `debug_pagination=true` |
| **persist** | Table `debug_guardrails` (DB) | Durable (survit aux cold starts) | `debug_pagination=true` + `debug_persist=true` |

| Protection | Limite | Clé | Comportement si dépassé |
|------------|--------|-----|-------------------------|
| **Debug rate limit** | 5 requêtes/minute | hash(IP + queryHash + salt) | EARLY RETURN: `source="degraded"` + `debug.rate_limited=true` |
| **Seed cooldown** | 1 exécution/10 minutes | hash(IP + salt) | `debug.seed.references.reason="cooldown_active"` |

**Mode persist** : Les IP sont hashées avec `DEBUG_GUARDRAILS_SALT` (env var ou fallback) avant stockage. Aucune donnée sensible en clair.

### Observability (serverless)

Pour diagnostiquer le comportement en environnement serverless :

| Champ debug | Description |
|-------------|-------------|
| `instance_id` | UUID unique de l'instance Deno. Si identique entre requêtes = même instance (hot). Si différent = cold start. |
| `rate_limit.mode` | "memory" ou "persist" selon le mode actif |
| `rate_limit.key_scope` | Toujours "ip+queryHash" (la clé réelle n'est pas exposée pour éviter les fuites IP/hash) |
| `rate_limit.remaining` | Nombre de requêtes debug restantes pour cette clé |
| `rate_limit.reset_at` | Timestamp Unix (ms) de reset du compteur |
| `rate_limit.window_start` | (persist seulement) ISO timestamp du début de la fenêtre |
| `seed.mode` | "memory" ou "persist" selon le mode actif |
| `seed.window_start` | (persist seulement) ISO timestamp du début de la fenêtre cooldown |

**Note mode memory** : Les stores rate-limit et cooldown sont en mémoire. En serverless, chaque cold start réinitialise ces compteurs. Pour valider le rate-limit en memory, il faut que les 6 requêtes touchent la même instance (même `instance_id`).

**Note mode persist** : Les compteurs sont stockés dans la table `debug_guardrails` et survivent aux cold starts. Cela permet de tester le rate-limit de manière fiable même si l'`instance_id` change.

### Structure de la réponse debug

Quand `debug_pagination=true`, la réponse inclut :

```json
{
  "debug": {
    "debug_version": 1,
    "instance_id": "a1b2c3d4-...",
    "rate_limit": {
      "mode": "persist",
      "key_scope": "ip+queryHash",
      "remaining": 4,
      "reset_at": 1767207800000,
      "window_start": "2025-01-01T12:00:00.000Z"
    },
    "pagination": {
      "articles": { "enabled": true, "batchSize": 1, "calls": 65, "rowsFetched": 64, "stoppedBecause": "empty_page" },
      "references": { "enabled": true, "batchSize": 1, "calls": 16, "rowsFetched": 15, "stoppedBecause": "empty_page" }
    },
    "probes": {
      "articles": { "probeSansFiltre": 64, "probeAvecFiltre": 64 },
      "references": { "probeSansFiltre": 15, "probeAvecFiltre": 15 }
    },
    "seed": {
      "references": { "seeded": false, "inserted": 0, "reason": "already_has_rows" },
      "mode": "persist",
      "window_start": "2025-01-01T12:00:00.000Z"
    }
  }
}
```

- `probes` n'apparaît **QUE** si `debug_probes=true`
- `seed` n'apparaît **QUE** si `seed_references=true`
- `window_start` n'apparaît **QUE** si `debug_persist=true`

### Exemples de payloads

**1) Mode normal (production) - aucun debug**
```json
{ "query": "LPD accès données", "mode": "legal" }
```
→ Pas de champ `debug` dans la réponse

**2) Debug pagination seul (memory)**
```json
{ "query": "LPD accès données", "mode": "legal", "debug_pagination": true }
```
→ `debug.pagination` présent, `debug.rate_limit.mode="memory"`

**3) Debug avec probes activés**
```json
{ "query": "LPD accès données", "mode": "legal", "debug_pagination": true, "debug_probes": true }
```
→ `debug.pagination` + `debug.probes` présents

**4) Debug avec seed activé**
```json
{ "query": "LPD accès données", "mode": "legal", "debug_pagination": true, "seed_references": true }
```
→ `debug.pagination` + `debug.seed` présents

**5) Test cooldown sans écrire (seed_cooldown_probe)**
```json
{ "query": "LPD accès données", "mode": "legal", "debug_pagination": true, "seed_references": true, "seed_cooldown_probe": true }
```
→ 1er appel: `debug.seed.references.reason="cooldown_probed_no_write"` (marque le cooldown sans écrire)
→ 2e appel (<10min): `debug.seed.references.reason="cooldown_active"` (prouve que le cooldown fonctionne)

**6) Test rate-limit durable (persist)**
```json
{ "query": "LPD accès données", "mode": "legal", "debug_pagination": true, "debug_persist": true }
```
→ `debug.rate_limit.mode="persist"` + `window_start` ISO
→ 6e appel: `rate_limited=true` même si `instance_id` change

**7) Test seed cooldown durable (persist)**
```json
{ "query": "LPD accès données", "mode": "legal", "debug_pagination": true, "debug_persist": true, "seed_references": true, "seed_cooldown_probe": true }
```
→ `debug.seed.mode="persist"` + `window_start` ISO
→ 2e appel (<10min): `reason="cooldown_active"` même si `instance_id` change

**8) Debug complet avec persist**
```json
{ "query": "LPD accès données", "mode": "legal", "debug_pagination": true, "debug_persist": true, "debug_probes": true, "seed_references": true }
```
→ Tous les champs debug avec mode persist

**9) Self-test debug (validation interne)**
```json
{ "query": "LPD accès données", "mode": "legal", "debug_pagination": true, "debug_persist": true, "self_test_debug": true }
```
→ Exécute dans une seule requête:
  - 6 appels rate-limit → vérifie que le 6e est bloqué
  - 2 appels seed cooldown → vérifie que le 2e est bloqué après mark

**⚠️ ATTENTION:** Le self-test consomme du quota RÉEL:
- **Rate-limit:** 6 tokens sur la clé `hash(IP + queryHash)` (fenêtre 1 min)
- **Seed cooldown:** Active le cooldown réel sur la clé `hash(IP)` (10 min)

Cela garantit que le test valide le vrai mécanisme anti-abus (pas une clé isolée).

Réponse attendue:
```json
{
  "ok": true,
  "debug": {
    "debug_version": 1,
    "instance_id": "a1b2c3d4-...",
    "self_test": {
      "rate_limit": {
        "mode": "persist",
        "window_ms": 60000,
        "max": 5,
        "runs": [
          { "i": 1, "allowed": true, "remaining": 4, "window_start": "...", "reset_at": 123 },
          { "i": 2, "allowed": true, "remaining": 3, "window_start": "...", "reset_at": 123 },
          { "i": 3, "allowed": true, "remaining": 2, "window_start": "...", "reset_at": 123 },
          { "i": 4, "allowed": true, "remaining": 1, "window_start": "...", "reset_at": 123 },
          { "i": 5, "allowed": true, "remaining": 0, "window_start": "...", "reset_at": 123 },
          { "i": 6, "allowed": false, "remaining": 0, "window_start": "...", "reset_at": 123 }
        ],
        "pass": true,
        "note": "Ce self-test consomme 6 tokens de rate-limit sur la clé réelle IP+queryHash"
      },
      "seed_cooldown": {
        "mode": "persist",
        "cooldown_ms": 600000,
        "first_check_allowed": true,
        "after_mark_blocked": true,
        "pass": true,
        "note": "Ce self-test active le cooldown réel sur la clé IP (10 min)"
      }
    }
  }
}
```

**Prérequis:** `debug_pagination=true` ET `debug_persist=true` sont obligatoires pour activer le self-test.

## Maintenance

- Ne jamais importer `src/` depuis une Edge Function
- Ne pas réintroduire de génériques TypeScript (Loveable peut casser les chevrons)
- Source de vérité Edge : `supabase/functions/_shared/paginatedFetch.ts`
- Debug doit rester 100% opt-in : aucun effet si `debug_pagination=false`
- Table `debug_guardrails` : RLS activé sans policy (service role only)
