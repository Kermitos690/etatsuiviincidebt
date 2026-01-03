-- =====================================================
-- PHASE 1: Complete Legal Database Structure
-- =====================================================

-- 1. Create legal_domains table (taxonomy of 12 domains)
CREATE TABLE IF NOT EXISTS public.legal_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label_fr TEXT NOT NULL,
  description TEXT,
  parent_code TEXT REFERENCES public.legal_domains(code),
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on legal_domains
ALTER TABLE public.legal_domains ENABLE ROW LEVEL SECURITY;

-- Legal domains are readable by all authenticated users
CREATE POLICY "Legal domains are viewable by authenticated users"
  ON public.legal_domains FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify legal domains
CREATE POLICY "Only admins can insert legal domains"
  ON public.legal_domains FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update legal domains"
  ON public.legal_domains FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete legal domains"
  ON public.legal_domains FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Create legal_laws table (index of all laws)
CREATE TABLE IF NOT EXISTS public.legal_laws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  abbreviation TEXT,
  blv_reference TEXT,
  domain TEXT NOT NULL,
  domain_category TEXT,
  canton TEXT DEFAULT 'CH',
  scope TEXT DEFAULT 'federal',
  domain_type TEXT,
  adoption_date DATE,
  entry_into_force DATE,
  last_revision DATE,
  is_current BOOLEAN DEFAULT true,
  replaced_by TEXT,
  source_url TEXT,
  total_articles INTEGER DEFAULT 0,
  seeded_articles INTEGER DEFAULT 0,
  keywords TEXT[] DEFAULT '{}',
  description TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(code_name, canton)
);

-- Enable RLS on legal_laws
ALTER TABLE public.legal_laws ENABLE ROW LEVEL SECURITY;

-- Legal laws are readable by all authenticated users
CREATE POLICY "Legal laws are viewable by authenticated users"
  ON public.legal_laws FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert laws (for dynamic enrichment)
CREATE POLICY "Authenticated users can insert legal laws"
  ON public.legal_laws FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admins can update/delete laws
CREATE POLICY "Only admins can update legal laws"
  ON public.legal_laws FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete legal laws"
  ON public.legal_laws FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Add columns to legal_references for better structure
ALTER TABLE public.legal_references 
  ADD COLUMN IF NOT EXISTS law_id UUID REFERENCES public.legal_laws(id),
  ADD COLUMN IF NOT EXISTS alinea TEXT,
  ADD COLUMN IF NOT EXISTS lettre TEXT,
  ADD COLUMN IF NOT EXISTS is_key_article BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS blv_reference TEXT,
  ADD COLUMN IF NOT EXISTS full_article_text TEXT,
  ADD COLUMN IF NOT EXISTS entry_into_force DATE,
  ADD COLUMN IF NOT EXISTS last_revision DATE;

-- 4. Add columns to legal_articles for consistency
ALTER TABLE public.legal_articles
  ADD COLUMN IF NOT EXISTS law_id UUID REFERENCES public.legal_laws(id),
  ADD COLUMN IF NOT EXISTS alinea TEXT,
  ADD COLUMN IF NOT EXISTS lettre TEXT,
  ADD COLUMN IF NOT EXISTS is_key_article BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS blv_reference TEXT;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_legal_laws_domain ON public.legal_laws(domain);
CREATE INDEX IF NOT EXISTS idx_legal_laws_canton ON public.legal_laws(canton);
CREATE INDEX IF NOT EXISTS idx_legal_laws_scope ON public.legal_laws(scope);
CREATE INDEX IF NOT EXISTS idx_legal_laws_code_name ON public.legal_laws(code_name);
CREATE INDEX IF NOT EXISTS idx_legal_references_law_id ON public.legal_references(law_id);
CREATE INDEX IF NOT EXISTS idx_legal_references_is_key ON public.legal_references(is_key_article);
CREATE INDEX IF NOT EXISTS idx_legal_articles_law_id ON public.legal_articles(law_id);

-- 6. Create updated_at trigger for new tables
CREATE TRIGGER update_legal_domains_updated_at
  BEFORE UPDATE ON public.legal_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_laws_updated_at
  BEFORE UPDATE ON public.legal_laws
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Add priority_laws and other columns to user_legal_preferences
ALTER TABLE public.user_legal_preferences
  ADD COLUMN IF NOT EXISTS priority_laws TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS excluded_domains TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notification_threshold NUMERIC DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS include_federal BOOLEAN DEFAULT true;