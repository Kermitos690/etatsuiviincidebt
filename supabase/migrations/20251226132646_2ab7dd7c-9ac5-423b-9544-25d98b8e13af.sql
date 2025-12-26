-- Table pour stocker les faits extraits de chaque email (Pass 1)
CREATE TABLE public.email_facts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  sender_name TEXT,
  sender_email TEXT,
  recipients TEXT[] DEFAULT '{}',
  cc_recipients TEXT[] DEFAULT '{}',
  mentioned_persons TEXT[] DEFAULT '{}',
  mentioned_institutions TEXT[] DEFAULT '{}',
  mentioned_dates DATE[] DEFAULT '{}',
  key_phrases TEXT[] DEFAULT '{}',
  action_items TEXT[] DEFAULT '{}',
  sentiment TEXT,
  urgency_level TEXT,
  raw_citations JSONB DEFAULT '[]',
  extracted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour le graphe de relations entre emails
CREATE TABLE public.email_relations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  target_email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL, -- 'reply', 'forward', 'reference', 'same_thread', 'same_sender', 'same_recipient'
  strength NUMERIC(3,2) DEFAULT 1.0, -- Force de la relation (0-1)
  evidence JSONB DEFAULT '{}', -- Preuves de la relation
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_email_id, target_email_id, relation_type)
);

-- Table pour les analyses de threads complets (Pass 2)
CREATE TABLE public.thread_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id TEXT NOT NULL,
  email_ids UUID[] NOT NULL,
  chronological_summary TEXT,
  detected_issues JSONB DEFAULT '[]', -- Chaque issue avec citations exactes
  participants JSONB DEFAULT '{}',
  timeline JSONB DEFAULT '[]',
  severity TEXT,
  confidence_score NUMERIC(3,2),
  citations JSONB DEFAULT '[]', -- Citations exactes obligatoires
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les corroborations croisées (Pass 3)
CREATE TABLE public.corroborations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
  thread_analysis_ids UUID[] DEFAULT '{}',
  attachment_ids UUID[] DEFAULT '{}',
  corroboration_type TEXT NOT NULL, -- 'confirmed', 'partial', 'contradicted', 'unverified'
  supporting_evidence JSONB DEFAULT '[]', -- Preuves avec citations
  contradicting_evidence JSONB DEFAULT '[]',
  final_confidence NUMERIC(3,2),
  verification_status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'rejected', 'needs_review'
  verified_by TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performances
CREATE INDEX idx_email_facts_email_id ON public.email_facts(email_id);
CREATE INDEX idx_email_relations_source ON public.email_relations(source_email_id);
CREATE INDEX idx_email_relations_target ON public.email_relations(target_email_id);
CREATE INDEX idx_thread_analyses_thread_id ON public.thread_analyses(thread_id);
CREATE INDEX idx_corroborations_incident_id ON public.corroborations(incident_id);

-- Enable RLS
ALTER TABLE public.email_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corroborations ENABLE ROW LEVEL SECURITY;

-- Policies pour email_facts
CREATE POLICY "Authenticated users can read email_facts" ON public.email_facts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert email_facts" ON public.email_facts FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update email_facts" ON public.email_facts FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete email_facts" ON public.email_facts FOR DELETE USING (true);

-- Policies pour email_relations
CREATE POLICY "Authenticated users can read email_relations" ON public.email_relations FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert email_relations" ON public.email_relations FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update email_relations" ON public.email_relations FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete email_relations" ON public.email_relations FOR DELETE USING (true);

-- Policies pour thread_analyses
CREATE POLICY "Authenticated users can read thread_analyses" ON public.thread_analyses FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert thread_analyses" ON public.thread_analyses FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update thread_analyses" ON public.thread_analyses FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete thread_analyses" ON public.thread_analyses FOR DELETE USING (true);

-- Policies pour corroborations
CREATE POLICY "Authenticated users can read corroborations" ON public.corroborations FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert corroborations" ON public.corroborations FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update corroborations" ON public.corroborations FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete corroborations" ON public.corroborations FOR DELETE USING (true);

-- Trigger pour updated_at sur corroborations
CREATE TRIGGER update_corroborations_updated_at
  BEFORE UPDATE ON public.corroborations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();