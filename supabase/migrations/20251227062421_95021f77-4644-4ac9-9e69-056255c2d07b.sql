-- Table pour les références légales avec validation utilisateur
CREATE TABLE public.legal_references (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  code_name TEXT NOT NULL, -- ex: "Code Civil", "CEDH", "Code Pénal"
  article_number TEXT NOT NULL, -- ex: "Article 1240"
  article_text TEXT, -- Texte complet de l'article
  domain TEXT, -- ex: "responsabilité civile", "droits fondamentaux"
  keywords TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  source_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour l'entraînement avec situations réelles
CREATE TABLE public.ai_situation_training (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email_id UUID REFERENCES public.emails(id),
  incident_id UUID REFERENCES public.incidents(id),
  
  -- Situation extraite par l'IA
  situation_summary TEXT NOT NULL,
  detected_violation_type TEXT,
  detected_legal_refs JSONB DEFAULT '[]', -- Références légales détectées par l'IA
  ai_confidence NUMERIC DEFAULT 0,
  ai_reasoning TEXT,
  
  -- Validation utilisateur
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'correct', 'incorrect', 'needs_verification', 'partially_correct')),
  user_correction TEXT,
  correct_legal_refs JSONB DEFAULT '[]', -- Références légales corrigées par l'utilisateur
  correction_notes TEXT,
  
  -- Métadonnées d'entraînement
  training_priority INTEGER DEFAULT 0,
  is_used_for_training BOOLEAN DEFAULT false,
  trained_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour la file d'active learning
CREATE TABLE public.active_learning_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('email', 'incident', 'legal_ref', 'situation')),
  entity_id UUID NOT NULL,
  
  -- Pourquoi l'IA propose cet item
  proposal_reason TEXT NOT NULL,
  uncertainty_score NUMERIC DEFAULT 0, -- Plus c'est haut, plus l'IA est incertaine
  potential_learning_value NUMERIC DEFAULT 0,
  
  -- Contexte enrichi
  context_summary TEXT,
  suggested_questions JSONB DEFAULT '[]',
  
  -- État
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'skipped', 'expired')),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days')
);

-- Table pour les patterns de relation entre entités
CREATE TABLE public.entity_relations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  
  source_type TEXT NOT NULL CHECK (source_type IN ('actor', 'institution', 'incident', 'email', 'legal_ref')),
  source_id TEXT NOT NULL,
  source_label TEXT,
  
  target_type TEXT NOT NULL CHECK (target_type IN ('actor', 'institution', 'incident', 'email', 'legal_ref')),
  target_id TEXT NOT NULL,
  target_label TEXT,
  
  relation_type TEXT NOT NULL, -- ex: "impliqué_dans", "référence", "contredit", "confirme"
  relation_strength NUMERIC DEFAULT 1.0,
  evidence JSONB DEFAULT '{}',
  
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.legal_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_situation_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_learning_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_relations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for legal_references
CREATE POLICY "Users can view own legal_references" ON public.legal_references FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own legal_references" ON public.legal_references FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own legal_references" ON public.legal_references FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own legal_references" ON public.legal_references FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for ai_situation_training
CREATE POLICY "Users can view own ai_situation_training" ON public.ai_situation_training FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own ai_situation_training" ON public.ai_situation_training FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own ai_situation_training" ON public.ai_situation_training FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own ai_situation_training" ON public.ai_situation_training FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for active_learning_queue
CREATE POLICY "Users can view own active_learning_queue" ON public.active_learning_queue FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own active_learning_queue" ON public.active_learning_queue FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own active_learning_queue" ON public.active_learning_queue FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own active_learning_queue" ON public.active_learning_queue FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for entity_relations
CREATE POLICY "Users can view own entity_relations" ON public.entity_relations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own entity_relations" ON public.entity_relations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own entity_relations" ON public.entity_relations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own entity_relations" ON public.entity_relations FOR DELETE USING (user_id = auth.uid());

-- Trigger pour updated_at
CREATE TRIGGER update_legal_references_updated_at BEFORE UPDATE ON public.legal_references FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_situation_training_updated_at BEFORE UPDATE ON public.ai_situation_training FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();