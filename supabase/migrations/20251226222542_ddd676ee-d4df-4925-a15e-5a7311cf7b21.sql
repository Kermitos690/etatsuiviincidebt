-- ============================================
-- PHASE 1 BIS: Correction des failles restantes
-- ============================================

-- 1. Supprimer les politiques trop permissives avec "OR user_id IS NULL"

-- emails
DROP POLICY IF EXISTS "Users can view own emails" ON public.emails;
DROP POLICY IF EXISTS "Users can update own emails" ON public.emails;
DROP POLICY IF EXISTS "Users can delete own emails" ON public.emails;

-- thread_analyses  
DROP POLICY IF EXISTS "Users can view own thread_analyses" ON public.thread_analyses;
DROP POLICY IF EXISTS "Users can update own thread_analyses" ON public.thread_analyses;
DROP POLICY IF EXISTS "Users can delete own thread_analyses" ON public.thread_analyses;

-- actor_trust_scores
DROP POLICY IF EXISTS "Users can view own actor_trust_scores" ON public.actor_trust_scores;
DROP POLICY IF EXISTS "Users can update own actor_trust_scores" ON public.actor_trust_scores;
DROP POLICY IF EXISTS "Users can delete own actor_trust_scores" ON public.actor_trust_scores;

-- incidents
DROP POLICY IF EXISTS "Users can view own incidents" ON public.incidents;
DROP POLICY IF EXISTS "Users can update own incidents" ON public.incidents;
DROP POLICY IF EXISTS "Users can delete own incidents" ON public.incidents;

-- 2. Recréer les politiques STRICTES (sans OR user_id IS NULL)

-- emails: politiques strictes
CREATE POLICY "Users can view own emails strict"
ON public.emails FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own emails strict"
ON public.emails FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own emails strict"
ON public.emails FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- thread_analyses: politiques strictes
CREATE POLICY "Users can view own thread_analyses strict"
ON public.thread_analyses FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own thread_analyses strict"
ON public.thread_analyses FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own thread_analyses strict"
ON public.thread_analyses FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- actor_trust_scores: politiques strictes
CREATE POLICY "Users can view own actor_trust_scores strict"
ON public.actor_trust_scores FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own actor_trust_scores strict"
ON public.actor_trust_scores FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own actor_trust_scores strict"
ON public.actor_trust_scores FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- incidents: politiques strictes
CREATE POLICY "Users can view own incidents strict"
ON public.incidents FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own incidents strict"
ON public.incidents FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own incidents strict"
ON public.incidents FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 3. Ajouter user_id aux tables qui en manquent

-- sheets_config: ajouter user_id
ALTER TABLE public.sheets_config ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- monthly_reports: ajouter user_id  
ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- audit_alerts: ajouter user_id
ALTER TABLE public.audit_alerts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- recurrence_tracking: ajouter user_id
ALTER TABLE public.recurrence_tracking ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- sync_status: ajouter user_id
ALTER TABLE public.sync_status ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- corroborations: ajouter user_id
ALTER TABLE public.corroborations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- betrayal_detections: ajouter user_id
ALTER TABLE public.betrayal_detections ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ai_training_feedback: ajouter user_id
ALTER TABLE public.ai_training_feedback ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Supprimer les anciennes politiques permissives des nouvelles tables

DROP POLICY IF EXISTS "Authenticated users can read sheets_config" ON public.sheets_config;
DROP POLICY IF EXISTS "Authenticated users can insert sheets_config" ON public.sheets_config;
DROP POLICY IF EXISTS "Authenticated users can update sheets_config" ON public.sheets_config;
DROP POLICY IF EXISTS "Authenticated users can delete sheets_config" ON public.sheets_config;

DROP POLICY IF EXISTS "Authenticated users can read monthly_reports" ON public.monthly_reports;
DROP POLICY IF EXISTS "Authenticated users can insert monthly_reports" ON public.monthly_reports;
DROP POLICY IF EXISTS "Authenticated users can update monthly_reports" ON public.monthly_reports;
DROP POLICY IF EXISTS "Authenticated users can delete monthly_reports" ON public.monthly_reports;

DROP POLICY IF EXISTS "Authenticated users can read audit_alerts" ON public.audit_alerts;
DROP POLICY IF EXISTS "Authenticated users can insert audit_alerts" ON public.audit_alerts;
DROP POLICY IF EXISTS "Authenticated users can update audit_alerts" ON public.audit_alerts;
DROP POLICY IF EXISTS "Authenticated users can delete audit_alerts" ON public.audit_alerts;

DROP POLICY IF EXISTS "Authenticated users can read recurrence_tracking" ON public.recurrence_tracking;
DROP POLICY IF EXISTS "Authenticated users can insert recurrence_tracking" ON public.recurrence_tracking;
DROP POLICY IF EXISTS "Authenticated users can update recurrence_tracking" ON public.recurrence_tracking;
DROP POLICY IF EXISTS "Authenticated users can delete recurrence_tracking" ON public.recurrence_tracking;

DROP POLICY IF EXISTS "Authenticated users can read sync_status" ON public.sync_status;
DROP POLICY IF EXISTS "Authenticated users can insert sync_status" ON public.sync_status;
DROP POLICY IF EXISTS "Authenticated users can update sync_status" ON public.sync_status;
DROP POLICY IF EXISTS "Authenticated users can delete sync_status" ON public.sync_status;

DROP POLICY IF EXISTS "Authenticated users can read corroborations" ON public.corroborations;
DROP POLICY IF EXISTS "Authenticated users can insert corroborations" ON public.corroborations;
DROP POLICY IF EXISTS "Authenticated users can update corroborations" ON public.corroborations;
DROP POLICY IF EXISTS "Authenticated users can delete corroborations" ON public.corroborations;

DROP POLICY IF EXISTS "Authenticated users can read betrayal_detections" ON public.betrayal_detections;
DROP POLICY IF EXISTS "Authenticated users can insert betrayal_detections" ON public.betrayal_detections;
DROP POLICY IF EXISTS "Authenticated users can update betrayal_detections" ON public.betrayal_detections;
DROP POLICY IF EXISTS "Authenticated users can delete betrayal_detections" ON public.betrayal_detections;

DROP POLICY IF EXISTS "Authenticated users can read ai_training_feedback" ON public.ai_training_feedback;
DROP POLICY IF EXISTS "Authenticated users can insert ai_training_feedback" ON public.ai_training_feedback;
DROP POLICY IF EXISTS "Authenticated users can update ai_training_feedback" ON public.ai_training_feedback;
DROP POLICY IF EXISTS "Authenticated users can delete ai_training_feedback" ON public.ai_training_feedback;

DROP POLICY IF EXISTS "Authenticated users can read swipe_training_results" ON public.swipe_training_results;

-- 5. Créer les nouvelles politiques restrictives

-- sheets_config
CREATE POLICY "Users can view own sheets_config"
ON public.sheets_config FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sheets_config"
ON public.sheets_config FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sheets_config"
ON public.sheets_config FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own sheets_config"
ON public.sheets_config FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- monthly_reports
CREATE POLICY "Users can view own monthly_reports"
ON public.monthly_reports FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own monthly_reports"
ON public.monthly_reports FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own monthly_reports"
ON public.monthly_reports FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own monthly_reports"
ON public.monthly_reports FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- audit_alerts
CREATE POLICY "Users can view own audit_alerts"
ON public.audit_alerts FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own audit_alerts"
ON public.audit_alerts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own audit_alerts"
ON public.audit_alerts FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own audit_alerts"
ON public.audit_alerts FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- recurrence_tracking
CREATE POLICY "Users can view own recurrence_tracking"
ON public.recurrence_tracking FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own recurrence_tracking"
ON public.recurrence_tracking FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own recurrence_tracking"
ON public.recurrence_tracking FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own recurrence_tracking"
ON public.recurrence_tracking FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- sync_status
CREATE POLICY "Users can view own sync_status"
ON public.sync_status FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sync_status"
ON public.sync_status FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sync_status"
ON public.sync_status FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own sync_status"
ON public.sync_status FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- corroborations
CREATE POLICY "Users can view own corroborations"
ON public.corroborations FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own corroborations"
ON public.corroborations FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own corroborations"
ON public.corroborations FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own corroborations"
ON public.corroborations FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- betrayal_detections
CREATE POLICY "Users can view own betrayal_detections"
ON public.betrayal_detections FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own betrayal_detections"
ON public.betrayal_detections FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own betrayal_detections"
ON public.betrayal_detections FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own betrayal_detections"
ON public.betrayal_detections FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ai_training_feedback
CREATE POLICY "Users can view own ai_training_feedback"
ON public.ai_training_feedback FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own ai_training_feedback"
ON public.ai_training_feedback FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ai_training_feedback"
ON public.ai_training_feedback FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own ai_training_feedback"
ON public.ai_training_feedback FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- swipe_training_results: corriger la lecture
CREATE POLICY "Users can view own swipe_training_results"
ON public.swipe_training_results FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 6. Index pour les nouvelles colonnes user_id
CREATE INDEX IF NOT EXISTS idx_sheets_config_user_id ON public.sheets_config(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_user_id ON public.monthly_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_alerts_user_id ON public.audit_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_tracking_user_id ON public.recurrence_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_status_user_id ON public.sync_status(user_id);
CREATE INDEX IF NOT EXISTS idx_corroborations_user_id ON public.corroborations(user_id);
CREATE INDEX IF NOT EXISTS idx_betrayal_detections_user_id ON public.betrayal_detections(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_training_feedback_user_id ON public.ai_training_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_swipe_training_results_user_id ON public.swipe_training_results(user_id);