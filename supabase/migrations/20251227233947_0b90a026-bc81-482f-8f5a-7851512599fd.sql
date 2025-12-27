-- Créer la table pour les alertes proactives
CREATE TABLE IF NOT EXISTS public.proactive_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alert_type text NOT NULL, -- deadline, anomaly, contradiction, template_abuse, critical_situation
  priority text NOT NULL DEFAULT 'moyenne', -- faible, moyenne, haute, critique
  title text NOT NULL,
  description text,
  entity_type text, -- email, incident, situation, actor
  entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  is_dismissed boolean DEFAULT false,
  due_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone,
  dismissed_at timestamp with time zone
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_proactive_alerts_user_id ON public.proactive_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_proactive_alerts_unread ON public.proactive_alerts(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_proactive_alerts_priority ON public.proactive_alerts(priority);
CREATE INDEX IF NOT EXISTS idx_proactive_alerts_due_date ON public.proactive_alerts(due_date) WHERE due_date IS NOT NULL;

-- RLS
ALTER TABLE public.proactive_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
ON public.proactive_alerts FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own alerts"
ON public.proactive_alerts FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own alerts"
ON public.proactive_alerts FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own alerts"
ON public.proactive_alerts FOR DELETE
USING (user_id = auth.uid());

-- Enable realtime for proactive_alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.proactive_alerts;

-- Table pour les délais légaux à suivre
CREATE TABLE IF NOT EXISTS public.legal_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity_type text NOT NULL, -- email, incident, situation
  entity_id uuid NOT NULL,
  deadline_type text NOT NULL, -- response_30_days, appeal_10_days, etc.
  deadline_date date NOT NULL,
  business_days_only boolean DEFAULT true,
  reminder_days integer[] DEFAULT '{7, 3, 1}',
  status text DEFAULT 'pending', -- pending, reminded, overdue, completed, dismissed
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_legal_deadlines_user ON public.legal_deadlines(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_deadlines_date ON public.legal_deadlines(deadline_date);
CREATE INDEX IF NOT EXISTS idx_legal_deadlines_status ON public.legal_deadlines(status);

ALTER TABLE public.legal_deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own deadlines" ON public.legal_deadlines
FOR ALL USING (user_id = auth.uid());

-- Table pour les templates d'emails détectés
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sender_pattern text, -- domain ou email pattern
  subject_pattern text,
  body_signature text, -- Hash ou signature du corps
  example_email_ids uuid[] DEFAULT '{}',
  occurrence_count integer DEFAULT 1,
  first_seen_at timestamp with time zone DEFAULT now(),
  last_seen_at timestamp with time zone DEFAULT now(),
  is_suspicious boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_user ON public.email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_sender ON public.email_templates(sender_pattern);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own templates" ON public.email_templates
FOR ALL USING (user_id = auth.uid());

-- Table pour comparaisons inter-situations
CREATE TABLE IF NOT EXISTS public.situation_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  folder_id_1 uuid NOT NULL REFERENCES public.pdf_folders(id) ON DELETE CASCADE,
  folder_id_2 uuid NOT NULL REFERENCES public.pdf_folders(id) ON DELETE CASCADE,
  comparison_type text NOT NULL, -- actors, timeline, violations, patterns
  similarity_score numeric DEFAULT 0,
  shared_actors jsonb DEFAULT '[]'::jsonb,
  shared_patterns jsonb DEFAULT '[]'::jsonb,
  contradictions jsonb DEFAULT '[]'::jsonb,
  risk_assessment text,
  analyzed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_situation_comparisons_user ON public.situation_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_situation_comparisons_folders ON public.situation_comparisons(folder_id_1, folder_id_2);

ALTER TABLE public.situation_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own comparisons" ON public.situation_comparisons
FOR ALL USING (user_id = auth.uid());

-- Trigger pour updated_at sur legal_deadlines
CREATE TRIGGER update_legal_deadlines_updated_at
BEFORE UPDATE ON public.legal_deadlines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();