-- =====================================================
-- AUDIT APPROFONDI: NETTOYAGE ET RENFORCEMENT RLS
-- =====================================================

-- 1. ACTOR_TRUST_SCORES: Supprimer les policies en double
DROP POLICY IF EXISTS "Users can delete their own actor trust scores" ON public.actor_trust_scores;
DROP POLICY IF EXISTS "Users can insert their own actor trust scores" ON public.actor_trust_scores;
DROP POLICY IF EXISTS "Users can update their own actor trust scores" ON public.actor_trust_scores;
DROP POLICY IF EXISTS "Users can view their own actor trust scores" ON public.actor_trust_scores;

-- 2. AUDIT_LOG: Supprimer les policies SELECT en double
DROP POLICY IF EXISTS "Users can view audit logs of own data" ON public.audit_log;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_log;
-- Garder seulement "Users can view their audit entries"

-- 3. INCIDENTS: Supprimer l'ancienne policy UPDATE permissive
DROP POLICY IF EXISTS "Users can update own incidents strict" ON public.incidents;
-- Garder seulement "Users can update unlocked incidents only" qui vérifie is_locked et transmis_jp

-- 4. SWIPE_TRAINING_PAIRS: Supprimer les policies en double
DROP POLICY IF EXISTS "Users can insert own training_pairs" ON public.swipe_training_pairs;
DROP POLICY IF EXISTS "Users can update own training_pairs" ON public.swipe_training_pairs;
DROP POLICY IF EXISTS "Users can view own training_pairs strict" ON public.swipe_training_pairs;
-- Garder les policies simples user_id = auth.uid()

-- 5. DEBUG_GUARDRAILS: Remplacer par une restriction service_role only
DROP POLICY IF EXISTS "Rate limit records are managed by service role" ON public.debug_guardrails;

-- Politique vide qui bloque tout accès utilisateur
CREATE POLICY "Debug guardrails service role only" ON public.debug_guardrails
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- 6. INCIDENT_EVENTS: Ajouter immuabilité explicite
CREATE POLICY "Incident events are immutable - no updates" ON public.incident_events
  FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "Incident events are immutable - no deletes" ON public.incident_events
  FOR DELETE TO authenticated
  USING (false);

-- 7. LEGAL_ARTICLES: Restreindre lecture aux utilisateurs authentifiés uniquement
DROP POLICY IF EXISTS "Users can view all legal articles" ON public.legal_articles;

CREATE POLICY "Authenticated users can view legal articles" ON public.legal_articles
  FOR SELECT TO authenticated
  USING (true);