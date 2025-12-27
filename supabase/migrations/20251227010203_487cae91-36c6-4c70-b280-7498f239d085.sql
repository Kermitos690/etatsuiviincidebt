-- Fix profiles table RLS - restrict to own profile only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new policy that restricts to own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Note: gmail_config already has proper user-scoped RLS but tokens are stored in plaintext
-- Encryption would require Supabase Vault which needs manual setup - marking as high difficulty