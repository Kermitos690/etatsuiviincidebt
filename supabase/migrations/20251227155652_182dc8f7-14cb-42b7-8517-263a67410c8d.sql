-- Phase 1: Security fixes - Restrict RLS policies

-- 1. Fix legal_articles: Only admins can INSERT/UPDATE
DROP POLICY IF EXISTS "Users can insert own legal articles" ON public.legal_articles;
DROP POLICY IF EXISTS "Users can update own legal articles" ON public.legal_articles;

CREATE POLICY "Only admins can insert legal articles" 
ON public.legal_articles 
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update legal articles" 
ON public.legal_articles 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Fix audit_log: Only service role can INSERT (via trigger), restrict WITH CHECK
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;

-- Create a more restrictive insert policy - only allowed via trigger (which uses service role)
CREATE POLICY "Service role can insert audit logs" 
ON public.audit_log 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- 3. Simplify swipe_training_pairs RLS - keep it simple with user_id check
DROP POLICY IF EXISTS "Users can delete own swipe_training_pairs" ON public.swipe_training_pairs;
DROP POLICY IF EXISTS "Users can insert own swipe_training_pairs" ON public.swipe_training_pairs;
DROP POLICY IF EXISTS "Users can update own swipe_training_pairs" ON public.swipe_training_pairs;
DROP POLICY IF EXISTS "Users can view own swipe_training_pairs" ON public.swipe_training_pairs;

CREATE POLICY "Users can view own swipe_training_pairs" 
ON public.swipe_training_pairs 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own swipe_training_pairs" 
ON public.swipe_training_pairs 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own swipe_training_pairs" 
ON public.swipe_training_pairs 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own swipe_training_pairs" 
ON public.swipe_training_pairs 
FOR DELETE 
TO authenticated
USING (user_id = auth.uid());