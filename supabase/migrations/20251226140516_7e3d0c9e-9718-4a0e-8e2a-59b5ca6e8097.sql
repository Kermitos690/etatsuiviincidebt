-- Add gmail_label column to emails table
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS gmail_label text DEFAULT 'INBOX';

-- Create ai_training_feedback table for storing user feedback on AI detections
CREATE TABLE public.ai_training_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  feedback_type text NOT NULL CHECK (feedback_type IN ('correct', 'false_positive', 'partial', 'missed_detection')),
  entity_type text NOT NULL CHECK (entity_type IN ('thread_analysis', 'corroboration', 'betrayal_detection', 'incident')),
  entity_id uuid NOT NULL,
  original_detection jsonb,
  user_correction jsonb,
  notes text,
  used_for_training boolean DEFAULT false
);

-- Create actor_trust_scores table for tracking reliability of actors
CREATE TABLE public.actor_trust_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  actor_name text NOT NULL,
  actor_email text,
  actor_role text,
  actor_institution text,
  trust_score numeric DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
  contradictions_count integer DEFAULT 0,
  promises_broken_count integer DEFAULT 0,
  hidden_communications_count integer DEFAULT 0,
  helpful_actions_count integer DEFAULT 0,
  evidence jsonb DEFAULT '[]'::jsonb,
  notes text
);

-- Create betrayal_detections table for storing detected betrayal patterns
CREATE TABLE public.betrayal_detections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  thread_id text NOT NULL,
  actor_name text NOT NULL,
  betrayal_type text NOT NULL CHECK (betrayal_type IN ('hidden_communication', 'contradiction', 'conflict_of_interest', 'manipulation', 'broken_promise', 'omission')),
  severity text NOT NULL CHECK (severity IN ('critique', 'haute', 'moyenne')),
  confidence text NOT NULL CHECK (confidence IN ('CERTAIN', 'PROBABLE', 'POSSIBLE')),
  evidence jsonb NOT NULL,
  counter_evidence jsonb,
  citations jsonb NOT NULL,
  verified boolean DEFAULT false,
  verified_by text,
  verified_at timestamp with time zone
);

-- Enable RLS on new tables
ALTER TABLE public.ai_training_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actor_trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.betrayal_detections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_training_feedback
CREATE POLICY "Authenticated users can read ai_training_feedback" ON public.ai_training_feedback FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert ai_training_feedback" ON public.ai_training_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update ai_training_feedback" ON public.ai_training_feedback FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete ai_training_feedback" ON public.ai_training_feedback FOR DELETE USING (true);

-- Create RLS policies for actor_trust_scores
CREATE POLICY "Authenticated users can read actor_trust_scores" ON public.actor_trust_scores FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert actor_trust_scores" ON public.actor_trust_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update actor_trust_scores" ON public.actor_trust_scores FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete actor_trust_scores" ON public.actor_trust_scores FOR DELETE USING (true);

-- Create RLS policies for betrayal_detections
CREATE POLICY "Authenticated users can read betrayal_detections" ON public.betrayal_detections FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert betrayal_detections" ON public.betrayal_detections FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update betrayal_detections" ON public.betrayal_detections FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete betrayal_detections" ON public.betrayal_detections FOR DELETE USING (true);

-- Create trigger for updated_at on actor_trust_scores
CREATE TRIGGER update_actor_trust_scores_updated_at
  BEFORE UPDATE ON public.actor_trust_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_ai_training_feedback_entity ON public.ai_training_feedback(entity_type, entity_id);
CREATE INDEX idx_actor_trust_scores_name ON public.actor_trust_scores(actor_name);
CREATE INDEX idx_actor_trust_scores_email ON public.actor_trust_scores(actor_email);
CREATE INDEX idx_betrayal_detections_thread ON public.betrayal_detections(thread_id);
CREATE INDEX idx_betrayal_detections_actor ON public.betrayal_detections(actor_name);
CREATE INDEX idx_emails_gmail_label ON public.emails(gmail_label);