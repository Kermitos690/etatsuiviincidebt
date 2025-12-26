-- Migration pour version durcie de analyze-email-advanced

-- 1) Ajouter user_id à la table emails pour ownership
ALTER TABLE public.emails 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 2) Ajouter colonnes manquantes à thread_analyses pour traçabilité
ALTER TABLE public.thread_analyses 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS model text,
ADD COLUMN IF NOT EXISTS prompt_version text,
ADD COLUMN IF NOT EXISTS input_hash text,
ADD COLUMN IF NOT EXISTS emails_count integer,
ADD COLUMN IF NOT EXISTS analysis_json jsonb;

-- 3) Index pour performance
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON public.emails(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_analyses_user_id ON public.thread_analyses(user_id);

-- 4) Politique RLS pour que les utilisateurs ne voient que leurs propres données
CREATE POLICY "Users can only view own emails" 
ON public.emails 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can only update own emails" 
ON public.emails 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can only view own thread analyses" 
ON public.thread_analyses 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can only insert own thread analyses" 
ON public.thread_analyses 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());