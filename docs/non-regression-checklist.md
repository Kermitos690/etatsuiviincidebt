# Non-Regression Checklist

**Version:** 1.0.0  
**Date:** 2025-12-31

Checklist à valider avant chaque déploiement pour garantir la non-régression.

---

## 1. Email Cleanup (`/email-cleanup`)

### ✅ Swipe Actions

- [ ] **Left swipe (Delete)**
  - Emails supprimés en batch (max 200/batch)
  - Stats `deleted` incrémenté
  - Toast de confirmation affiché
  - État `deleting` reset à `false`

- [ ] **Right swipe (Whitelist)**
  - Domain ajouté à `gmail_config.domains`
  - Stats `kept` incrémenté
  - Toast de confirmation affiché

- [ ] **Down swipe (Blacklist + Delete)**
  - Insert dans `email_blacklist`
  - Emails supprimés
  - Stats `blacklisted` incrémenté
  - Toast de confirmation affiché

- [ ] **Up swipe (Skip)**
  - Stats `skipped` incrémenté
  - Aucune modification DB

### ✅ Gestion d'erreurs

- [ ] Erreur RLS → Toast "Droits insuffisants (RLS)"
- [ ] Erreur réseau → Toast générique + console.error
- [ ] État `deleting` TOUJOURS reset dans `finally`
- [ ] Pas de freeze UI après erreur

### ✅ Guards

- [ ] Pas d'action si `currentGroup === null`
- [ ] Pas d'action si `deleting === true`
- [ ] Pas d'action si `user === null` (session expirée)

---

## 2. Legal Verify Edge Function

### ✅ Pagination

- [ ] `paginatedFetch` utilise `.range(offset, offset + BATCH_SIZE - 1)`
- [ ] Arrêt si `data.length < BATCH_SIZE`
- [ ] Arrêt si `allRows.length >= MAX_ROWS` (2000)
- [ ] Log JSON: `{ fetched_total, batches }`

### ✅ Cache

- [ ] Cache hit → retour immédiat sans Perplexity
- [ ] Cache TTL = 7 jours
- [ ] Cache miss → appel externe si gatekeeper OK

### ✅ Gatekeeper

- [ ] Mode `jurisprudence` → toujours externe
- [ ] `force_external: true` → toujours externe
- [ ] Mots-clés ATF/arrêt → externe
- [ ] 2+ matches locaux haute relevance → local
- [ ] Mode roles/definitions + 1 match → local

### ✅ Fallback

- [ ] `PERPLEXITY_API_KEY` absent → `DEGRADED_RESPONSE`
- [ ] Timeout Perplexity → fallback local ou dégradé
- [ ] Jamais d'erreur non gérée (toujours une réponse)

---

## 3. Tests Automatisés

### ✅ Unit Tests (`tests/`)

```bash
npx vitest
```

- [ ] `tests/legal-verify-utils.test.ts` → PASS
  - isHostMatch
  - calculateRelevance
  - clampConfidence
  - uniqueCitations
  - shouldCallPerplexity
  - paginatedFetch

- [ ] `tests/email-cleanup.test.ts` → PASS
  - extractDomain
  - extractEmail
  - isEmailRelevant
  - batchDelete
  - handleSwipe state management
  - isGenericDomain

### ✅ Type Check

```bash
npx tsc --noEmit
```

- [ ] Aucune erreur TypeScript

---

## 4. Constantes Centralisées

| Constante | Valeur | Fichier |
|-----------|--------|---------|
| `EMAIL_CLEANUP_BATCH_SIZE` | 200 | src/utils/emailCleanup.utils.ts |
| `LEGAL_VERIFY_BATCH_SIZE` | 500 | src/utils/legalVerify.utils.ts |
| `LEGAL_VERIFY_MAX_ROWS` | 2000 | src/utils/legalVerify.utils.ts |
| `CACHE_TTL_DAYS` | 7 | src/utils/legalVerify.utils.ts |

---

## 5. RLS Policies Requises

### emails

```sql
-- Users can delete own emails
USING (user_id = auth.uid())
```

### email_blacklist

```sql
-- Users can insert own blacklist
WITH CHECK (user_id = auth.uid())

-- Users can delete own blacklist
USING (user_id = auth.uid())
```

### gmail_config

```sql
-- Users can update own config
USING (user_id = auth.uid())
```

---

## 6. Logs Attendus

### Console (Frontend)

```javascript
// Succès
{ action: 'swipe', direction: 'left', groupId: 'example.com', emailCount: 42 }

// Erreur
'[handleSwipe] Error:', { direction, groupId, error }
```

### Edge Function (Supabase)

```json
{ "action": "legal-verify", "source": "local", "matches_count": 5 }
{ "action": "paginatedFetch", "table": "legal_articles", "fetched_total": 847 }
```

---

## 7. Scenarios de Test Manuel

### 7.1 Email Cleanup

1. **Supprimer un groupe de 10 emails**
   - Aller sur `/email-cleanup`
   - Swipe left sur un groupe
   - Vérifier toast "10 emails supprimés"
   - Vérifier que les emails ont disparu

2. **Whitelist un domaine**
   - Swipe right sur un groupe
   - Vérifier toast "domain ajouté à la whitelist"
   - Aller sur `/gmail-config`
   - Vérifier que le domaine apparaît

3. **Blacklist + Delete**
   - Swipe down sur un groupe
   - Vérifier toast "X emails supprimés et source blacklistée"
   - Vérifier que les emails ont disparu

4. **Erreur RLS simulée**
   - Déconnecter (clear session)
   - Tenter un swipe
   - Vérifier toast "Session expirée"

### 7.2 Legal Verify

1. **Cache hit**
   - Appeler legal-verify avec même query 2x
   - Vérifier `warnings: ["cache_hit"]` sur 2ème appel

2. **Local only (2+ high matches)**
   - Query "curateur curatelle protection adulte"
   - Vérifier `source: "local"`

3. **External required (jurisprudence)**
   - Query "jurisprudence ATF récente"
   - Vérifier appel Perplexity (ou fallback si clé absente)

---

## 8. Commandes de Vérification

```bash
# Lancer tous les tests
npm test

# Type check
npx tsc --noEmit

# Build production
npm run build

# Vérifier les erreurs console en dev
npm run dev
```

---

*Checklist maintenue par l'équipe Lovable - 2025*
