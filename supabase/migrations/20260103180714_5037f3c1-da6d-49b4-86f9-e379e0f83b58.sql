-- Table pour les suggestions d'incidents en attente de validation
CREATE TABLE public.incident_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email_source_id UUID REFERENCES public.emails(id) ON DELETE SET NULL,
  
  -- Données suggérées par l'IA
  suggested_title TEXT NOT NULL,
  suggested_facts TEXT,
  suggested_dysfunction TEXT,
  suggested_institution TEXT,
  suggested_type TEXT,
  suggested_gravity TEXT,
  confidence INTEGER DEFAULT 0,
  ai_analysis JSONB,
  legal_mentions JSONB,
  
  -- Statut de validation
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'low_importance')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  rejection_reason TEXT,
  
  -- Incident créé après validation
  created_incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_suggestions_user_status ON public.incident_suggestions(user_id, status);
CREATE INDEX idx_suggestions_created ON public.incident_suggestions(created_at DESC);
CREATE INDEX idx_suggestions_email ON public.incident_suggestions(email_source_id);

-- Trigger pour updated_at
CREATE TRIGGER update_incident_suggestions_updated_at
  BEFORE UPDATE ON public.incident_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.incident_suggestions ENABLE ROW LEVEL SECURITY;

-- Policies RLS
CREATE POLICY "Users can view own suggestions"
  ON public.incident_suggestions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own suggestions"
  ON public.incident_suggestions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own suggestions"
  ON public.incident_suggestions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own suggestions"
  ON public.incident_suggestions
  FOR DELETE
  USING (auth.uid() = user_id);