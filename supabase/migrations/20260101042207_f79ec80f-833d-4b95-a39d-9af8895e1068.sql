-- Remove remaining permissive policies on legal_articles
DROP POLICY IF EXISTS "Users can delete own legal articles" ON public.legal_articles;
DROP POLICY IF EXISTS "Users can insert own legal articles" ON public.legal_articles;
DROP POLICY IF EXISTS "Users can update own legal articles" ON public.legal_articles;