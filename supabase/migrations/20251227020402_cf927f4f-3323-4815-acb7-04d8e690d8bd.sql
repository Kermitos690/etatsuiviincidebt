-- Fix training pairs RLS policy to prevent cross-user data leakage
-- Users should only see pairs where they own BOTH emails or they created the pair

DROP POLICY IF EXISTS "Users can view own training_pairs" ON public.swipe_training_pairs;

-- Stricter policy: user owns the pair directly, or owns BOTH emails
CREATE POLICY "Users can view own training_pairs strict"
ON public.swipe_training_pairs
FOR SELECT
USING (
  user_id = auth.uid()
  OR (
    public.user_owns_email(email_1_id) 
    AND public.user_owns_email(email_2_id)
  )
);