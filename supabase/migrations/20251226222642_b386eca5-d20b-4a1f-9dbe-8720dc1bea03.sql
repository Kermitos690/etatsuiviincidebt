-- Corriger les politiques de swipe_training_pairs

-- Supprimer les anciennes politiques permissives
DROP POLICY IF EXISTS "Authenticated users can insert swipe_training_pairs" ON public.swipe_training_pairs;
DROP POLICY IF EXISTS "Authenticated users can read swipe_training_pairs" ON public.swipe_training_pairs;
DROP POLICY IF EXISTS "Authenticated users can update swipe_training_pairs" ON public.swipe_training_pairs;

-- Ajouter user_id si pas présent
ALTER TABLE public.swipe_training_pairs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Créer une fonction pour vérifier la propriété des paires de training
CREATE OR REPLACE FUNCTION public.user_owns_training_pair(_pair_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.swipe_training_pairs p
    WHERE p.id = _pair_id 
    AND (
      p.user_id = auth.uid()
      OR public.user_owns_email(p.email_1_id)
      OR public.user_owns_email(p.email_2_id)
    )
  )
$$;

-- Nouvelles politiques restrictives
CREATE POLICY "Users can view own training_pairs"
ON public.swipe_training_pairs FOR SELECT TO authenticated
USING (
  user_id = auth.uid() 
  OR public.user_owns_email(email_1_id) 
  OR public.user_owns_email(email_2_id)
);

CREATE POLICY "Users can insert own training_pairs"
ON public.swipe_training_pairs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own training_pairs"
ON public.swipe_training_pairs FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Index
CREATE INDEX IF NOT EXISTS idx_swipe_training_pairs_user_id ON public.swipe_training_pairs(user_id);