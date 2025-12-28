-- Table pour stocker les exports PDF des incidents
CREATE TABLE public.incident_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes INTEGER,
  export_options JSONB DEFAULT '{}'::jsonb,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour récupérer rapidement les exports d'un incident
CREATE INDEX idx_incident_exports_incident_id ON public.incident_exports(incident_id);
CREATE INDEX idx_incident_exports_user_id ON public.incident_exports(user_id);

-- Enable RLS
ALTER TABLE public.incident_exports ENABLE ROW LEVEL SECURITY;

-- Users can only access their own exports
CREATE POLICY "Users can view own incident exports" ON public.incident_exports
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own incident exports" ON public.incident_exports
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own incident exports" ON public.incident_exports
  FOR DELETE USING (user_id = auth.uid());

-- Trigger pour updated_at
CREATE TRIGGER update_incident_exports_updated_at
  BEFORE UPDATE ON public.incident_exports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Créer le bucket de stockage pour les exports PDF
INSERT INTO storage.buckets (id, name, public) 
VALUES ('incident-exports', 'incident-exports', false);

-- Politique pour lire ses propres exports
CREATE POLICY "Users can read own exports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'incident-exports' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Politique pour uploader ses exports  
CREATE POLICY "Users can upload exports" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'incident-exports' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Politique pour supprimer ses exports
CREATE POLICY "Users can delete own exports from storage" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'incident-exports' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );