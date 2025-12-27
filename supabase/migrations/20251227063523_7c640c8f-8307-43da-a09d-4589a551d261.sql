-- Table pour stocker les anomalies détectées
CREATE TABLE public.anomaly_detections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anomaly_type TEXT NOT NULL, -- 'communication_pattern', 'behavior_change', 'timing_anomaly', 'sentiment_shift', 'frequency_spike'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Entités concernées
  related_actor_id UUID REFERENCES public.actor_trust_scores(id) ON DELETE SET NULL,
  related_email_ids UUID[] DEFAULT '{}',
  related_incident_ids UUID[] DEFAULT '{}',
  
  -- Données d'analyse
  pattern_data JSONB DEFAULT '{}', -- Données brutes du pattern détecté
  baseline_data JSONB DEFAULT '{}', -- Données de référence normales
  deviation_score NUMERIC DEFAULT 0, -- Score de déviation (0-100)
  confidence NUMERIC DEFAULT 0, -- Confiance de la détection (0-100)
  
  -- Contexte temporel
  time_window_start TIMESTAMP WITH TIME ZONE,
  time_window_end TIMESTAMP WITH TIME ZONE,
  
  -- Statut et résolution
  status TEXT NOT NULL DEFAULT 'new', -- 'new', 'investigating', 'confirmed', 'false_positive', 'resolved'
  investigated_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  -- IA
  ai_explanation TEXT,
  ai_recommendations JSONB DEFAULT '[]',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_anomaly_detections_user_id ON public.anomaly_detections(user_id);
CREATE INDEX idx_anomaly_detections_type ON public.anomaly_detections(anomaly_type);
CREATE INDEX idx_anomaly_detections_severity ON public.anomaly_detections(severity);
CREATE INDEX idx_anomaly_detections_status ON public.anomaly_detections(status);
CREATE INDEX idx_anomaly_detections_detected_at ON public.anomaly_detections(detected_at DESC);

-- Enable RLS
ALTER TABLE public.anomaly_detections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own anomalies"
  ON public.anomaly_detections FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own anomalies"
  ON public.anomaly_detections FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own anomalies"
  ON public.anomaly_detections FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own anomalies"
  ON public.anomaly_detections FOR DELETE
  USING (user_id = auth.uid());

-- Trigger pour updated_at
CREATE TRIGGER update_anomaly_detections_updated_at
  BEFORE UPDATE ON public.anomaly_detections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Table pour les baselines de comportement (données de référence)
CREATE TABLE public.behavior_baselines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'actor', 'institution', 'domain'
  entity_id TEXT NOT NULL,
  entity_label TEXT,
  
  -- Métriques de base
  avg_emails_per_day NUMERIC DEFAULT 0,
  avg_response_time_hours NUMERIC DEFAULT 0,
  typical_sentiment NUMERIC DEFAULT 0, -- -1 à 1
  typical_hours JSONB DEFAULT '[]', -- Heures typiques d'envoi
  typical_days JSONB DEFAULT '[]', -- Jours typiques
  
  -- Patterns de communication
  communication_frequency JSONB DEFAULT '{}',
  topic_distribution JSONB DEFAULT '{}',
  recipient_patterns JSONB DEFAULT '{}',
  
  -- Dernière mise à jour
  sample_size INTEGER DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, entity_type, entity_id)
);

-- Enable RLS
ALTER TABLE public.behavior_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own baselines"
  ON public.behavior_baselines FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own baselines"
  ON public.behavior_baselines FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own baselines"
  ON public.behavior_baselines FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own baselines"
  ON public.behavior_baselines FOR DELETE
  USING (user_id = auth.uid());

CREATE TRIGGER update_behavior_baselines_updated_at
  BEFORE UPDATE ON public.behavior_baselines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();