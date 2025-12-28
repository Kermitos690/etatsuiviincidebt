-- Drop existing restrictive policies for legal_articles
DROP POLICY IF EXISTS "Only admins can insert legal articles" ON public.legal_articles;
DROP POLICY IF EXISTS "Only admins can update legal articles" ON public.legal_articles;
DROP POLICY IF EXISTS "Only admins can delete legal articles" ON public.legal_articles;

-- Create new policies that allow users to manage their own legal articles
CREATE POLICY "Users can insert own legal articles" 
ON public.legal_articles 
FOR INSERT 
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update own legal articles" 
ON public.legal_articles 
FOR UPDATE 
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can delete own legal articles" 
ON public.legal_articles 
FOR DELETE 
USING (user_id = auth.uid() OR user_id IS NULL);

-- Also enable RLS on legal_search_results if not already enabled
ALTER TABLE public.legal_search_results ENABLE ROW LEVEL SECURITY;

-- Create policies for legal_search_results
DROP POLICY IF EXISTS "Users can view own search results" ON public.legal_search_results;
DROP POLICY IF EXISTS "Users can insert own search results" ON public.legal_search_results;
DROP POLICY IF EXISTS "Users can update own search results" ON public.legal_search_results;
DROP POLICY IF EXISTS "Users can delete own search results" ON public.legal_search_results;

CREATE POLICY "Users can view own search results" 
ON public.legal_search_results 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own search results" 
ON public.legal_search_results 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own search results" 
ON public.legal_search_results 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own search results" 
ON public.legal_search_results 
FOR DELETE 
USING (user_id = auth.uid());