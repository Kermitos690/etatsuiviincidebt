-- Phase 3: Extend legal tables with cantonal support

-- Add columns to legal_references for cantonal filtering
ALTER TABLE public.legal_references 
ADD COLUMN IF NOT EXISTS canton TEXT DEFAULT 'CH',
ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'federal' CHECK (scope IN ('federal', 'cantonal', 'communal')),
ADD COLUMN IF NOT EXISTS domain_type TEXT DEFAULT 'administratif' CHECK (domain_type IN ('civil', 'penal', 'administratif', 'social', 'fiscal'));

-- Add columns to legal_articles for cantonal filtering
ALTER TABLE public.legal_articles
ADD COLUMN IF NOT EXISTS canton TEXT DEFAULT 'CH',
ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'federal' CHECK (scope IN ('federal', 'cantonal', 'communal')),
ADD COLUMN IF NOT EXISTS domain_type TEXT DEFAULT 'administratif' CHECK (domain_type IN ('civil', 'penal', 'administratif', 'social', 'fiscal'));

-- Create user_legal_preferences table for personalized filtering
CREATE TABLE IF NOT EXISTS public.user_legal_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  preferred_canton TEXT DEFAULT 'VD',
  preferred_scope TEXT DEFAULT 'all' CHECK (preferred_scope IN ('federal', 'cantonal', 'all')),
  preferred_domains TEXT[] DEFAULT ARRAY['administratif', 'social']::TEXT[],
  surveillance_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  auto_verify_legal BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on user_legal_preferences
ALTER TABLE public.user_legal_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_legal_preferences
CREATE POLICY "Users can view own legal preferences"
ON public.user_legal_preferences
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own legal preferences"
ON public.user_legal_preferences
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own legal preferences"
ON public.user_legal_preferences
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own legal preferences"
ON public.user_legal_preferences
FOR DELETE
USING (user_id = auth.uid());

-- Create indexes for faster cantonal queries
CREATE INDEX IF NOT EXISTS idx_legal_references_canton ON public.legal_references(canton);
CREATE INDEX IF NOT EXISTS idx_legal_references_scope ON public.legal_references(scope);
CREATE INDEX IF NOT EXISTS idx_legal_references_domain_type ON public.legal_references(domain_type);

CREATE INDEX IF NOT EXISTS idx_legal_articles_canton ON public.legal_articles(canton);
CREATE INDEX IF NOT EXISTS idx_legal_articles_scope ON public.legal_articles(scope);
CREATE INDEX IF NOT EXISTS idx_legal_articles_domain_type ON public.legal_articles(domain_type);

-- Update trigger for user_legal_preferences
CREATE OR REPLACE FUNCTION public.update_user_legal_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_user_legal_preferences_updated_at ON public.user_legal_preferences;

CREATE TRIGGER update_user_legal_preferences_updated_at
BEFORE UPDATE ON public.user_legal_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_user_legal_preferences_updated_at();

-- Seed some key Vaud cantonal laws into legal_references
INSERT INTO public.legal_references (code_name, article_number, article_text, domain, keywords, canton, scope, domain_type, is_verified, source_url)
VALUES 
  ('LVPAE', '1', 'La presente loi regle la mise en oeuvre dans le canton de Vaud des dispositions du Code civil suisse relatives a la protection de l''adulte et de l''enfant.', 'protection_adulte', ARRAY['curatelle', 'protection', 'APEA', 'adulte'], 'VD', 'cantonal', 'social', true, 'https://www.lexfind.ch/fe/fr/tol/17943/fr'),
  ('LVPAE', '3', 'La Justice de paix est l''autorite de protection de l''adulte et de l''enfant au sens de l''article 440 CC.', 'protection_adulte', ARRAY['justice de paix', 'APEA', 'autorite'], 'VD', 'cantonal', 'social', true, 'https://www.lexfind.ch/fe/fr/tol/17943/fr'),
  ('LVPAE', '12', 'L''autorite de protection doit statuer dans un delai raisonnable. Elle informe regulierement les parties de l''avancement de la procedure.', 'protection_adulte', ARRAY['delai', 'procedure', 'information'], 'VD', 'cantonal', 'social', true, 'https://www.lexfind.ch/fe/fr/tol/17943/fr'),
  ('LPA-VD', '2', 'La presente loi s''applique aux autorites administratives cantonales et communales, dans la mesure ou la legislation speciale n''en dispose pas autrement.', 'procedure', ARRAY['procedure', 'administrative', 'canton'], 'VD', 'cantonal', 'administratif', true, 'https://www.lexfind.ch/fe/fr/tol/17950/fr'),
  ('LPA-VD', '29', 'Les autorites rendent leurs decisions dans un delai raisonnable. En cas de retard injustifie, l''interesse peut porter plainte aupres de l''autorite de surveillance.', 'procedure', ARRAY['delai', 'retard', 'plainte', 'decision'], 'VD', 'cantonal', 'administratif', true, 'https://www.lexfind.ch/fe/fr/tol/17950/fr'),
  ('LPA-VD', '35', 'Les parties ont le droit de consulter le dossier de la cause qui les concerne. Ce droit ne peut etre restreint que dans des cas exceptionnels.', 'procedure', ARRAY['dossier', 'consultation', 'acces', 'parties'], 'VD', 'cantonal', 'administratif', true, 'https://www.lexfind.ch/fe/fr/tol/17950/fr'),
  ('LSP-VD', '80', 'Les professionnels de la sante sont tenus au secret professionnel. Ils ne peuvent divulguer les informations relatives a leurs patients sans autorisation.', 'sante', ARRAY['secret', 'professionnel', 'sante', 'donnees'], 'VD', 'cantonal', 'social', true, 'https://www.lexfind.ch/fe/fr/tol/18008/fr'),
  ('LASV', '4', 'L''aide sociale a pour but de garantir a toute personne dans le besoin les moyens d''existence necessaires.', 'social', ARRAY['aide sociale', 'minimum vital', 'subsistance'], 'VD', 'cantonal', 'social', true, 'https://www.lexfind.ch/fe/fr/tol/17983/fr'),
  ('LASV', '16', 'L''autorite competente doit statuer sur les demandes d''aide sociale dans un delai de 30 jours suivant le depot d''une demande complete.', 'social', ARRAY['delai', 'decision', 'aide', 'demande'], 'VD', 'cantonal', 'social', true, 'https://www.lexfind.ch/fe/fr/tol/17983/fr')
ON CONFLICT DO NOTHING;

-- Update existing federal references with explicit canton/scope
UPDATE public.legal_references 
SET canton = 'CH', scope = 'federal'
WHERE canton IS NULL OR canton = '';

UPDATE public.legal_articles 
SET canton = 'CH', scope = 'federal'
WHERE canton IS NULL OR canton = '';