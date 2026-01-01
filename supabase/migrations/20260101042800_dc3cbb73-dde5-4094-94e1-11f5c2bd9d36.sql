-- =====================================================
-- AUDIT APPROFONDI V2: CORRECTIONS SÉCURITÉ LEGAL_ARTICLES
-- =====================================================

-- 1. Supprimer les policies actuelles avec bypass NULL user_id
DROP POLICY IF EXISTS "Admins can insert legal articles" ON public.legal_articles;
DROP POLICY IF EXISTS "Admins can update legal articles" ON public.legal_articles;
DROP POLICY IF EXISTS "Admins can delete legal articles" ON public.legal_articles;
DROP POLICY IF EXISTS "Users can insert legal articles with null or own user_id" ON public.legal_articles;
DROP POLICY IF EXISTS "Users can update their own legal articles" ON public.legal_articles;
DROP POLICY IF EXISTS "Users can delete their own legal articles" ON public.legal_articles;

-- 2. Recréer des policies strictes SANS bypass NULL
-- INSERT: Seul l'utilisateur peut créer ses propres articles (obligatoirement avec son user_id)
CREATE POLICY "Users can insert their own legal articles" ON public.legal_articles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Seul le propriétaire peut modifier
CREATE POLICY "Users can update own legal articles only" ON public.legal_articles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Seul le propriétaire peut supprimer
CREATE POLICY "Users can delete own legal articles only" ON public.legal_articles
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 3. Les articles système (user_id NULL) sont en lecture seule - gérés par admins via service_role
-- La policy SELECT existante "Authenticated users can view legal articles" reste en place