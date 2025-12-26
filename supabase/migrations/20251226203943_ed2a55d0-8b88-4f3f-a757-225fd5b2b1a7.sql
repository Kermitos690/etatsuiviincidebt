-- Table des paires d'entraînement à valider
CREATE TABLE public.swipe_training_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_1_id UUID REFERENCES public.emails(id) ON DELETE CASCADE,
  email_2_id UUID REFERENCES public.emails(id) ON DELETE CASCADE,
  pair_type TEXT NOT NULL CHECK (pair_type IN ('same_thread', 'same_sender', 'cross_reference', 'ai_suggested', 'contradiction')),
  ai_prediction TEXT CHECK (ai_prediction IN ('corroboration', 'contradiction', 'unrelated')),
  ai_confidence NUMERIC DEFAULT 0 CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  ai_enrichment JSONB DEFAULT '{}'::jsonb,
  context_summary TEXT,
  keywords_overlap TEXT[] DEFAULT '{}',
  actors_overlap TEXT[] DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT now(),
  priority_score INTEGER DEFAULT 0,
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des résultats de swipe
CREATE TABLE public.swipe_training_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID REFERENCES public.swipe_training_pairs(id) ON DELETE CASCADE,
  user_id UUID,
  user_decision TEXT NOT NULL CHECK (user_decision IN ('confirm', 'deny', 'need_more', 'spam', 'manual')),
  swipe_direction TEXT CHECK (swipe_direction IN ('right', 'left', 'up', 'down')),
  relationship_type TEXT,
  manual_notes TEXT,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  time_spent_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table statistiques gamification
CREATE TABLE public.swipe_training_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  total_swipes INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  badges JSONB DEFAULT '[]'::jsonb,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_swipe_pairs_unprocessed ON public.swipe_training_pairs(is_processed) WHERE NOT is_processed;
CREATE INDEX idx_swipe_pairs_priority ON public.swipe_training_pairs(priority_score DESC);
CREATE INDEX idx_swipe_results_user ON public.swipe_training_results(user_id);
CREATE INDEX idx_swipe_results_pair ON public.swipe_training_results(pair_id);

-- RLS policies
ALTER TABLE public.swipe_training_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipe_training_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipe_training_stats ENABLE ROW LEVEL SECURITY;

-- Policies pour swipe_training_pairs
CREATE POLICY "Authenticated users can read swipe_training_pairs" 
ON public.swipe_training_pairs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert swipe_training_pairs" 
ON public.swipe_training_pairs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update swipe_training_pairs" 
ON public.swipe_training_pairs FOR UPDATE TO authenticated USING (true);

-- Policies pour swipe_training_results
CREATE POLICY "Authenticated users can read swipe_training_results" 
ON public.swipe_training_results FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert own results" 
ON public.swipe_training_results FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Policies pour swipe_training_stats
CREATE POLICY "Users can read own stats" 
ON public.swipe_training_stats FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own stats" 
ON public.swipe_training_stats FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own stats" 
ON public.swipe_training_stats FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Trigger pour updated_at sur stats
CREATE TRIGGER update_swipe_training_stats_updated_at
BEFORE UPDATE ON public.swipe_training_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();