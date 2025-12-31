# Stability Contract

**Version:** 1.0.0  
**Date:** 2025-12-31

Ce document définit le comportement attendu des fonctionnalités critiques pour garantir la non-régression.

---

## 1. Email Cleanup (`/email-cleanup`)

### 1.1 État "Terminé"

L'action de cleanup est considérée comme **terminée** lorsque:

- ✅ `currentIndex >= groups.length - 1`
- ✅ Toast affiché: "Nettoyage terminé !"
- ✅ État `deleting` remis à `false`
- ✅ Stats mises à jour (deleted, kept, blacklisted, skipped)

### 1.2 Actions Swipe

| Direction | Action | Effet sur données |
|-----------|--------|-------------------|
| `left` | Supprimer | Emails supprimés (batch 200) |
| `right` | Whitelist | Domain ajouté à `gmail_config.domains` |
| `down` | Blacklist + Delete | Insert `email_blacklist` + suppression emails |
| `up` | Ignorer | Stats `skipped` incrémenté, aucune modification DB |

### 1.3 Gestion d'erreurs

```
try {
  // action
} catch (error) {
  console.error('[handleSwipe] Error:', { direction, groupId, error });
  toast.error(msg); // Message explicite
} finally {
  setDeleting(false); // TOUJOURS exécuté
}
```

### 1.4 Batch Delete

```typescript
const BATCH_SIZE = 200;

// Suppression par lots pour éviter timeout
for (let i = 0; i < ids.length; i += BATCH_SIZE) {
  const batch = ids.slice(i, i + BATCH_SIZE);
  await supabase.from('emails').delete().in('id', batch);
}
```

---

## 2. Legal Verify Edge Function

### 2.1 Pagination

| Constante | Valeur | Usage |
|-----------|--------|-------|
| `BATCH_SIZE` | 500 | Taille de chaque requête `.range()` |
| `MAX_ROWS` | 2000 | Maximum absolu de lignes récupérées |

```typescript
// Loop pagination
while (allRows.length < MAX_ROWS) {
  const { data } = await supabase
    .from(table)
    .select(cols)
    .range(offset, offset + BATCH_SIZE - 1);
  
  if (!data || data.length === 0) break;
  if (data.length < BATCH_SIZE) break; // Dernière page
  
  allRows.push(...data);
  offset += BATCH_SIZE;
}
```

### 2.2 Cache TTL

```typescript
const CACHE_TTL_DAYS = 7;

// Requête cache avec cutoff
const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - CACHE_TTL_DAYS);
```

### 2.3 Gatekeeper Logic

Le gatekeeper décide si un appel Perplexity est nécessaire:

| Condition | Décision | Reason |
|-----------|----------|--------|
| `force_external: true` | External | `force_external` |
| `mode === "jurisprudence"` | External | `jurisprudence` |
| Query contient ATF, arrêt, etc. | External | `external_keyword:*` |
| `mode === "deadlines"` + précision | External | `deadline_precision` |
| 2+ matches locaux (relevance ≥ 0.5) | Local | `local>=2_high` |
| Mode roles/definitions + 1+ match | Local | `local_for_mode` |
| 1+ match local | Local | `local>=1` |
| Aucun match | External | `no_local_match` |

### 2.4 Fallback (PERPLEXITY_API_KEY absent)

```typescript
const DEGRADED_RESPONSE: LegalVerifyResponse = {
  summary: "Cadre légal non vérifié – service externe indisponible",
  key_points: [],
  citations: [],
  confidence: 0,
  warnings: ["perplexity_unavailable"],
  source: "degraded",
  cost_saved: false,
};
```

Le système retourne TOUJOURS une réponse valide, même dégradée.

---

## 3. Erreurs RLS

### 3.1 Messages Attendus

| Table | Opération | Erreur RLS | Message UI |
|-------|-----------|------------|------------|
| `emails` | DELETE | `violates row-level security` | "Droits insuffisants (RLS)" |
| `email_blacklist` | INSERT | `violates row-level security` | "Droits insuffisants (RLS)" |
| `gmail_config` | UPDATE | `violates row-level security` | "Droits insuffisants (RLS)" |

### 3.2 Détection

```typescript
if (error) {
  const isRLS = error.message?.includes('row-level security') ||
                error.code === '42501';
  if (isRLS) {
    throw new Error('Droits insuffisants (RLS)');
  }
  throw error;
}
```

---

## 4. Assertions Runtime

### 4.1 Garde-fous Obligatoires

```typescript
// 1. Vérifier groupe courant
if (!currentGroup || deleting) return;

// 2. Vérifier authentification
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  toast.error('Session expirée, veuillez vous reconnecter');
  return;
}

// 3. Vérifier IDs avant suppression
const emailIds = getGroupEmailIds();
if (emailIds.length === 0) {
  console.warn('No email IDs to delete');
  return;
}
```

---

## 5. Logs Structurés

### 5.1 Format Standard

```typescript
console.log({
  action: 'swipe',
  direction: 'left',
  groupId: 'example.com',
  emailCount: 42
});

console.error('[handleSwipe] Error:', {
  direction,
  groupId,
  error: error.message
});
```

### 5.2 Edge Function Logs

```typescript
console.log(JSON.stringify({
  action: 'legal-verify',
  source: 'local',
  matches_count: 5,
  confidence: 0.72
}));
```

---

## 6. Contrats de Type

### 6.1 EmailCleanup Types

```typescript
type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null;

interface DomainGroup {
  domain: string;
  senderEmail?: string;
  emailCount: number;
  examples: EmailRow[];
  isRelevant: boolean;
  matchedKeywords: string[];
}

interface EmailRow {
  id: string;
  subject: string;
  sender: string;
  received_at: string;
}
```

### 6.2 LegalVerify Types

```typescript
type LegalVerifyMode = 'legal' | 'procedure' | 'roles' | 'deadlines' | 'definitions' | 'jurisprudence';

interface LegalVerifyResponse {
  summary: string;
  key_points: string[];
  citations: LegalCitation[];
  confidence: number; // 0..1
  warnings?: string[];
  source: 'local' | 'external' | 'hybrid' | 'degraded';
  cost_saved: boolean;
}
```

---

*Contrat maintenu par l'équipe Lovable - 2025*
