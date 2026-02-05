
# Refactorisation Complete du Projet - Plan Structuré

## Vue d'ensemble du projet

Application juridique suisse de suivi d'incidents de curatelle avec:
- Synchronisation Gmail et analyse automatique des emails
- Détection IA d'incidents avec validation utilisateur
- Système d'entraînement IA bidirectionnel (SwipeTraining, IATraining, Suggestions)
- Pipeline d'analyse en 5 étapes
- Export PDF pour le Juge de Paix

---

## Phase 1: Consolidation de l'Architecture

### 1.1 Organisation des fichiers

**Barrel exports manquants a creer:**
```
src/types/index.ts        - Export centralise des types
src/services/index.ts     - Export des services
src/utils/index.ts        - Export des utilitaires
src/stores/index.ts       - Export du store
```

**Composants a reorganiser:**
```
src/components/training/              - Nouveau dossier
  ├── index.ts                        - Barrel export
  ├── TrainingCard.tsx                - Composant reutilisable
  ├── ValidationButtons.tsx           - Boutons validation/rejet
  └── ConfidenceBadge.tsx             - Badge de confiance
```

### 1.2 Configuration centralisee

**Fichier a creer: `src/config/trainingConfig.ts`**
```
- VIOLATION_TYPES
- CONFIDENCE_THRESHOLDS
- TRAINING_PRIORITIES
- ACTION_TYPES
```

---

## Phase 2: Correction des Fonctionnalites Entraînement IA

### 2.1 Page IATraining (`src/pages/IATraining.tsx`)

**Problemes identifies:**
1. Pas de gestion de chargement pour les actions
2. Pas de rafraichissement automatique apres validation
3. Pas de lien vers l'email source pour contexte

**Corrections:**
- Ajouter bouton "Voir l'email source" si `email_id` present
- Implementer `useMutation` pour les actions (cohérence avec Suggestions)
- Ajouter stats de progression (cas traites aujourd'hui, total valide)
- Synchroniser avec `ai_training_feedback` apres chaque action

### 2.2 Page SwipeTraining (`src/pages/SwipeTraining.tsx`)

**Problemes identifies:**
1. Fonction `generatePairs` n'invalide pas le cache TanStack Query
2. Stats utilisateur pas toujours creees automatiquement
3. Pas de fallback si aucun email analyse

**Corrections:**
- Utiliser `queryClient.invalidateQueries` apres generation
- Creer stats automatiquement si absentes (via Edge Function)
- Ajouter empty state avec lien vers "/analysis-pipeline"
- Ameliorer l'UX mobile (swipe gesture natif)

### 2.3 Page Suggestions (`src/pages/Suggestions.tsx`)

**Etat actuel:** Fonctionnel mais peut etre ameliore

**Ameliorations:**
- Ajouter possibilite de modifier la suggestion avant approbation
- Afficher l'email source inline (apercu du corps)
- Ajouter compteur de confiance visuel (Progress bar)

### 2.4 Backend: Boucle d'entrainement

**Fichiers concernes:**
```
supabase/functions/_shared/training.ts
supabase/functions/auto-process-email/index.ts
supabase/functions/analyze-email-advanced/index.ts
supabase/functions/approve-suggestion/index.ts
supabase/functions/generate-training-pairs/index.ts
```

**Corrections:**
1. `generate-training-pairs`: Ajouter verification que l'utilisateur a des emails analyses
2. `auto-process-email`: Enregistrer aussi les cas a faible confiance pour validation
3. `training.ts`: Ajouter cache pour eviter re-fetch a chaque requete
4. Creer `swipe_training_stats` si absent lors du premier swipe

---

## Phase 3: Correction des Pages Incompletes

### 3.1 ControlCenter (`src/pages/ControlCenter.tsx`)

**Problemes:**
- Onglet "Actions" pointe vers `QuickActions` mais pas de contenu visible
- Onglet "Analyse IA" incomplet

**Corrections:**
- Implementer contenu de l'onglet "Actions" avec liens vers pipelines
- Ajouter resume des stats IA dans l'onglet "Analyse IA"
- Integrer `ActorTrustPanel` et `CorroborationPanel` dans vues dediees

### 3.2 Journal (`src/pages/Journal.tsx`)

**Verification necessaire:** S'assurer que la page affiche bien l'historique audit

### 3.3 Events (`src/pages/Events.tsx`)

**Verification necessaire:** Confirmer que les evenements d'incidents s'affichent

### 3.4 Profile (`src/pages/Profile.tsx`)

**Ameliorations:**
- Ajouter section preferences utilisateur
- Ajouter stats personnelles (incidents crees, emails analyses)

---

## Phase 4: Securite RLS

**13 warnings detectes:** Politiques RLS avec `USING (true)` pour INSERT/UPDATE/DELETE

**Tables a corriger (priorite haute):**
- `incident_suggestions`
- `ai_training_feedback`
- `ai_situation_training`
- `swipe_training_pairs`
- `swipe_training_results`
- `swipe_training_stats`

**Migration SQL a executer:**
```sql
-- Renforcer RLS pour tables d'entrainement IA
ALTER POLICY "..." ON ai_situation_training 
  USING (user_id = auth.uid());

ALTER POLICY "..." ON ai_training_feedback
  USING (user_id = auth.uid());

-- etc. pour chaque table avec warning
```

---

## Phase 5: Coherence UI/UX

### 5.1 Composants communs

**Creer/standardiser:**
```
src/components/common/ConfidenceIndicator.tsx  - Indicateur confiance IA
src/components/common/TrainingProgress.tsx     - Progression entrainement
src/components/common/LegalReference.tsx       - Affichage references legales
```

### 5.2 Navigation

**AppSidebar a mettre a jour:**
- Grouper "IA Training", "Swipe Training", "Suggestions" sous categorie "Entrainement IA"
- Ajouter badges de notification pour suggestions en attente

### 5.3 Layout mobile

**Verifier:**
- `MobileBottomNav` inclut acces aux fonctions entrainement
- Responsive sur toutes les pages entrainement

---

## Phase 6: Tests et Validation

### 6.1 Tests unitaires a ajouter

```
tests/training.test.ts           - Tests buildTrainingPromptContext
tests/suggestions.test.ts        - Tests approbation/rejet
tests/swipe-training.test.ts     - Tests generation paires
```

### 6.2 Checklist non-regression

Mettre a jour `docs/non-regression-checklist.md`:
- [ ] IATraining: Valider/Corriger/Rejeter fonctionne
- [ ] SwipeTraining: Generation paires + stats
- [ ] Suggestions: Approbation cree incident
- [ ] Pipeline: 5 etapes completent sans erreur
- [ ] Gmail: Connexion OAuth fonctionne (apres fix)

---

## Sequence d'Implementation

```text
Etape 1: Securite RLS (migration SQL)
    ↓
Etape 2: Backend Edge Functions (training.ts, generate-training-pairs)
    ↓
Etape 3: IATraining.tsx (corrections + liens email)
    ↓
Etape 4: SwipeTraining.tsx (cache invalidation + stats auto)
    ↓
Etape 5: Suggestions.tsx (edition avant approbation)
    ↓
Etape 6: ControlCenter.tsx (onglets complets)
    ↓
Etape 7: Composants communs (ConfidenceIndicator, etc.)
    ↓
Etape 8: Navigation (badges + groupement)
    ↓
Etape 9: Tests + Documentation
```

---

## Fichiers a Modifier (Liste Complete)

**Frontend:**
- `src/pages/IATraining.tsx`
- `src/pages/SwipeTraining.tsx`
- `src/pages/Suggestions.tsx`
- `src/pages/ControlCenter.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/suggestions/SuggestionCard.tsx`

**Backend:**
- `supabase/functions/_shared/training.ts`
- `supabase/functions/generate-training-pairs/index.ts`
- `supabase/functions/auto-process-email/index.ts`

**Nouveaux fichiers:**
- `src/config/trainingConfig.ts`
- `src/components/training/index.ts`
- `src/components/common/ConfidenceIndicator.tsx`
- `src/types/index.ts`

**Migration SQL:**
- Correction des 13 politiques RLS trop permissives

---

## Resume Executif

Ce plan couvre:
1. **Securite** - Correction des 13 warnings RLS
2. **Entrainement IA complet** - 3 pages fonctionnelles et interconnectees
3. **Coherence code** - Organisation fichiers + composants reutilisables
4. **UX** - Navigation amelioree + badges notifications
5. **Stabilite** - Tests + documentation

Estimation: Implementation en 2-3 sessions de travail structurees.
