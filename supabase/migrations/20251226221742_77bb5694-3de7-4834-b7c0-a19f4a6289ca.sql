-- ============================================
-- PHASE 1: SÉCURITÉ CRITIQUE - Correction RLS
-- ============================================

-- 1. Supprimer toutes les politiques trop permissives sur les tables sensibles

-- emails: supprimer les politiques permissives
DROP POLICY IF EXISTS "Authenticated users can read emails" ON public.emails;
DROP POLICY IF EXISTS "Authenticated users can insert emails" ON public.emails;
DROP POLICY IF EXISTS "Authenticated users can update emails" ON public.emails;
DROP POLICY IF EXISTS "Authenticated users can delete emails" ON public.emails;

-- thread_analyses: supprimer les politiques permissives
DROP POLICY IF EXISTS "Authenticated users can read thread_analyses" ON public.thread_analyses;
DROP POLICY IF EXISTS "Authenticated users can insert thread_analyses" ON public.thread_analyses;
DROP POLICY IF EXISTS "Authenticated users can update thread_analyses" ON public.thread_analyses;
DROP POLICY IF EXISTS "Authenticated users can delete thread_analyses" ON public.thread_analyses;

-- email_attachments: supprimer les politiques permissives
DROP POLICY IF EXISTS "Authenticated users can read attachments" ON public.email_attachments;
DROP POLICY IF EXISTS "Authenticated users can insert attachments" ON public.email_attachments;
DROP POLICY IF EXISTS "Authenticated users can update attachments" ON public.email_attachments;
DROP POLICY IF EXISTS "Authenticated users can delete attachments" ON public.email_attachments;

-- email_facts: supprimer les politiques permissives
DROP POLICY IF EXISTS "Authenticated users can read email_facts" ON public.email_facts;
DROP POLICY IF EXISTS "Authenticated users can insert email_facts" ON public.email_facts;
DROP POLICY IF EXISTS "Authenticated users can update email_facts" ON public.email_facts;
DROP POLICY IF EXISTS "Authenticated users can delete email_facts" ON public.email_facts;

-- email_relations: supprimer les politiques permissives
DROP POLICY IF EXISTS "Authenticated users can read email_relations" ON public.email_relations;
DROP POLICY IF EXISTS "Authenticated users can insert email_relations" ON public.email_relations;
DROP POLICY IF EXISTS "Authenticated users can update email_relations" ON public.email_relations;
DROP POLICY IF EXISTS "Authenticated users can delete email_relations" ON public.email_relations;

-- gmail_config: supprimer les politiques permissives
DROP POLICY IF EXISTS "Authenticated users can read gmail_config" ON public.gmail_config;
DROP POLICY IF EXISTS "Authenticated users can insert gmail_config" ON public.gmail_config;
DROP POLICY IF EXISTS "Authenticated users can update gmail_config" ON public.gmail_config;
DROP POLICY IF EXISTS "Authenticated users can delete gmail_config" ON public.gmail_config;

-- actor_trust_scores: supprimer les politiques permissives
DROP POLICY IF EXISTS "Authenticated users can read actor_trust_scores" ON public.actor_trust_scores;
DROP POLICY IF EXISTS "Authenticated users can insert actor_trust_scores" ON public.actor_trust_scores;
DROP POLICY IF EXISTS "Authenticated users can update actor_trust_scores" ON public.actor_trust_scores;
DROP POLICY IF EXISTS "Authenticated users can delete actor_trust_scores" ON public.actor_trust_scores;

-- incidents: supprimer les politiques permissives
DROP POLICY IF EXISTS "Authenticated users can read incidents" ON public.incidents;
DROP POLICY IF EXISTS "Authenticated users can insert incidents" ON public.incidents;
DROP POLICY IF EXISTS "Authenticated users can update incidents" ON public.incidents;
DROP POLICY IF EXISTS "Authenticated users can delete incidents" ON public.incidents;

-- 2. Ajouter user_id aux tables qui en ont besoin

-- gmail_config: ajouter user_id si pas présent
ALTER TABLE public.gmail_config ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- incidents: ajouter user_id si pas présent
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- actor_trust_scores: ajouter user_id si pas présent
ALTER TABLE public.actor_trust_scores ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Créer une fonction sécurisée pour vérifier la propriété des emails

CREATE OR REPLACE FUNCTION public.user_owns_email(_email_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.emails
    WHERE id = _email_id AND (user_id = auth.uid() OR user_id IS NULL)
  )
$$;

-- 4. Nouvelles politiques RLS restrictives

-- emails: politiques basées sur user_id
CREATE POLICY "Users can view own emails"
ON public.emails FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert own emails"
ON public.emails FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own emails"
ON public.emails FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL)
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can delete own emails"
ON public.emails FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

-- thread_analyses: politiques basées sur user_id
CREATE POLICY "Users can view own thread_analyses"
ON public.thread_analyses FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert own thread_analyses"
ON public.thread_analyses FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own thread_analyses"
ON public.thread_analyses FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can delete own thread_analyses"
ON public.thread_analyses FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

-- email_attachments: basé sur la propriété de l'email parent
CREATE POLICY "Users can view attachments of own emails"
ON public.email_attachments FOR SELECT
TO authenticated
USING (public.user_owns_email(email_id));

CREATE POLICY "Users can insert attachments for own emails"
ON public.email_attachments FOR INSERT
TO authenticated
WITH CHECK (public.user_owns_email(email_id));

CREATE POLICY "Users can update attachments of own emails"
ON public.email_attachments FOR UPDATE
TO authenticated
USING (public.user_owns_email(email_id));

CREATE POLICY "Users can delete attachments of own emails"
ON public.email_attachments FOR DELETE
TO authenticated
USING (public.user_owns_email(email_id));

-- email_facts: basé sur la propriété de l'email parent
CREATE POLICY "Users can view facts of own emails"
ON public.email_facts FOR SELECT
TO authenticated
USING (public.user_owns_email(email_id));

CREATE POLICY "Users can insert facts for own emails"
ON public.email_facts FOR INSERT
TO authenticated
WITH CHECK (public.user_owns_email(email_id));

CREATE POLICY "Users can update facts of own emails"
ON public.email_facts FOR UPDATE
TO authenticated
USING (public.user_owns_email(email_id));

CREATE POLICY "Users can delete facts of own emails"
ON public.email_facts FOR DELETE
TO authenticated
USING (public.user_owns_email(email_id));

-- email_relations: basé sur la propriété des emails source/target
CREATE POLICY "Users can view own email relations"
ON public.email_relations FOR SELECT
TO authenticated
USING (public.user_owns_email(source_email_id) OR public.user_owns_email(target_email_id));

CREATE POLICY "Users can insert own email relations"
ON public.email_relations FOR INSERT
TO authenticated
WITH CHECK (public.user_owns_email(source_email_id));

CREATE POLICY "Users can update own email relations"
ON public.email_relations FOR UPDATE
TO authenticated
USING (public.user_owns_email(source_email_id));

CREATE POLICY "Users can delete own email relations"
ON public.email_relations FOR DELETE
TO authenticated
USING (public.user_owns_email(source_email_id));

-- gmail_config: politiques basées sur user_id
CREATE POLICY "Users can view own gmail_config"
ON public.gmail_config FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own gmail_config"
ON public.gmail_config FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own gmail_config"
ON public.gmail_config FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own gmail_config"
ON public.gmail_config FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- actor_trust_scores: politiques basées sur user_id
CREATE POLICY "Users can view own actor_trust_scores"
ON public.actor_trust_scores FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert own actor_trust_scores"
ON public.actor_trust_scores FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own actor_trust_scores"
ON public.actor_trust_scores FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can delete own actor_trust_scores"
ON public.actor_trust_scores FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

-- incidents: politiques basées sur user_id
CREATE POLICY "Users can view own incidents"
ON public.incidents FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert own incidents"
ON public.incidents FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own incidents"
ON public.incidents FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can delete own incidents"
ON public.incidents FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

-- 5. Supprimer les anciennes politiques redondantes sur emails

DROP POLICY IF EXISTS "Users can only view own emails" ON public.emails;
DROP POLICY IF EXISTS "Users can only update own emails" ON public.emails;
DROP POLICY IF EXISTS "Users can only insert own thread analyses" ON public.thread_analyses;
DROP POLICY IF EXISTS "Users can only view own thread analyses" ON public.thread_analyses;

-- 6. Index pour améliorer les performances des requêtes RLS

CREATE INDEX IF NOT EXISTS idx_emails_user_id ON public.emails(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_analyses_user_id ON public.thread_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_config_user_id ON public.gmail_config(user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON public.incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_actor_trust_scores_user_id ON public.actor_trust_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_email_attachments_email_id ON public.email_attachments(email_id);
CREATE INDEX IF NOT EXISTS idx_email_facts_email_id ON public.email_facts(email_id);
CREATE INDEX IF NOT EXISTS idx_email_relations_source ON public.email_relations(source_email_id);
CREATE INDEX IF NOT EXISTS idx_email_relations_target ON public.email_relations(target_email_id);