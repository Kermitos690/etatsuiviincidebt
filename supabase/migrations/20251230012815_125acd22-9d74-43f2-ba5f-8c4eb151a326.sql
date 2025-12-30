-- Table pour stocker les événements manuels (texte, documents, captures)
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL DEFAULT 'manual' CHECK (event_type IN ('manual', 'document', 'screenshot', 'video', 'import')),
  content TEXT, -- Texte copié/collé ou extrait
  source_type TEXT, -- 'paste', 'word', 'pdf', 'screenshot', 'video'
  file_path TEXT, -- Chemin dans le storage si fichier uploadé
  file_name TEXT,
  file_mime_type TEXT,
  file_size_bytes INTEGER,
  extracted_text TEXT, -- Texte extrait du document/OCR
  ai_analysis JSONB, -- Analyse IA de l'événement
  is_analyzed BOOLEAN DEFAULT false,
  analysis_date TIMESTAMP WITH TIME ZONE,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
  related_thread_id TEXT, -- Thread Gmail si lié
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own events"
  ON public.events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
  ON public.events FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_events_user_id ON public.events(user_id);
CREATE INDEX idx_events_event_date ON public.events(event_date DESC);
CREATE INDEX idx_events_incident_id ON public.events(incident_id);

-- Trigger for updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for event files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-files',
  'event-files',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
);

-- Storage policies for event-files bucket
CREATE POLICY "Users can view their own event files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own event files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own event files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'event-files' AND auth.uid()::text = (storage.foldername(name))[1]);