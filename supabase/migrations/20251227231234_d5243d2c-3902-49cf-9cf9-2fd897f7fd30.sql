-- Enrichir pdf_folders pour devenir des "Situations"
ALTER TABLE public.pdf_folders 
ADD COLUMN IF NOT EXISTS situation_status text DEFAULT 'ouvert',
ADD COLUMN IF NOT EXISTS situation_type text,
ADD COLUMN IF NOT EXISTS institution_concerned text,
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'moyenne',
ADD COLUMN IF NOT EXISTS problem_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_analysis_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS summary text,
ADD COLUMN IF NOT EXISTS participants jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS timeline jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS violations_detected jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS recommendations jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS linked_incident_ids uuid[] DEFAULT '{}';

-- Créer la table situation_analyses pour les analyses croisées
CREATE TABLE IF NOT EXISTS public.situation_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.pdf_folders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  analyzed_at timestamp with time zone DEFAULT now(),
  model text,
  prompt_version text DEFAULT 'v1',
  
  -- Analyse consolidée
  summary text,
  chronological_summary text,
  problem_score integer DEFAULT 0,
  confidence_score numeric DEFAULT 0,
  severity text DEFAULT 'none',
  
  -- Données extraites
  participants jsonb DEFAULT '[]'::jsonb,
  timeline jsonb DEFAULT '[]'::jsonb,
  
  -- Problèmes détectés
  contradictions jsonb DEFAULT '[]'::jsonb,
  violations_detected jsonb DEFAULT '[]'::jsonb,
  unanswered_questions jsonb DEFAULT '[]'::jsonb,
  deadline_violations jsonb DEFAULT '[]'::jsonb,
  
  -- Recommandations
  recommendations jsonb DEFAULT '[]'::jsonb,
  legal_references jsonb DEFAULT '[]'::jsonb,
  jp_actions jsonb DEFAULT '[]'::jsonb,
  
  -- Métadonnées
  documents_analyzed integer DEFAULT 0,
  total_pages integer DEFAULT 0,
  analysis_json jsonb,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_situation_analyses_folder_id ON public.situation_analyses(folder_id);
CREATE INDEX IF NOT EXISTS idx_situation_analyses_user_id ON public.situation_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_folders_situation_status ON public.pdf_folders(situation_status);
CREATE INDEX IF NOT EXISTS idx_pdf_folders_priority ON public.pdf_folders(priority);
CREATE INDEX IF NOT EXISTS idx_pdf_folders_problem_score ON public.pdf_folders(problem_score);

-- RLS pour situation_analyses
ALTER TABLE public.situation_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own situation_analyses"
ON public.situation_analyses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own situation_analyses"
ON public.situation_analyses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own situation_analyses"
ON public.situation_analyses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own situation_analyses"
ON public.situation_analyses FOR DELETE
USING (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE TRIGGER update_situation_analyses_updated_at
BEFORE UPDATE ON public.situation_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();