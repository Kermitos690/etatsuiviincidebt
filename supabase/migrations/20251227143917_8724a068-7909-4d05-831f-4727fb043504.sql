-- Table pour les dossiers/affaires
CREATE TABLE public.pdf_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'folder',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les documents PDF uploadés
CREATE TABLE public.pdf_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  folder_id UUID REFERENCES public.pdf_folders(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  page_count INTEGER,
  document_type TEXT DEFAULT 'discussion',
  metadata JSONB DEFAULT '{}',
  extracted_text TEXT,
  extraction_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour l'analyse IA des PDF (similaire à emails)
CREATE TABLE public.pdf_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.pdf_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  analysis_type TEXT DEFAULT 'full',
  ai_analysis JSONB,
  thread_analysis JSONB,
  timeline JSONB,
  participants JSONB,
  problem_score INTEGER DEFAULT 0,
  severity TEXT DEFAULT 'none',
  confidence_score NUMERIC(3,2) DEFAULT 0,
  summary TEXT,
  recommendations JSONB,
  legal_references JSONB,
  analyzed_at TIMESTAMP WITH TIME ZONE,
  model TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les incidents créés depuis les PDF
CREATE TABLE public.pdf_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.pdf_documents(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pdf_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_incidents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pdf_folders
CREATE POLICY "Users can view their own folders" 
  ON public.pdf_folders FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders" 
  ON public.pdf_folders FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" 
  ON public.pdf_folders FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" 
  ON public.pdf_folders FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for pdf_documents
CREATE POLICY "Users can view their own documents" 
  ON public.pdf_documents FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents" 
  ON public.pdf_documents FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" 
  ON public.pdf_documents FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" 
  ON public.pdf_documents FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for pdf_analyses
CREATE POLICY "Users can view their own analyses" 
  ON public.pdf_analyses FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses" 
  ON public.pdf_analyses FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses" 
  ON public.pdf_analyses FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses" 
  ON public.pdf_analyses FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for pdf_incidents
CREATE POLICY "Users can view their own pdf incidents" 
  ON public.pdf_incidents FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pdf incidents" 
  ON public.pdf_incidents FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pdf incidents" 
  ON public.pdf_incidents FOR DELETE 
  USING (auth.uid() = user_id);

-- Create storage bucket for PDF documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pdf-documents', 'pdf-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for pdf-documents bucket
CREATE POLICY "Users can upload their own PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pdf-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own PDFs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pdf-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own PDFs"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'pdf-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own PDFs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'pdf-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Triggers for updated_at
CREATE TRIGGER update_pdf_folders_updated_at
  BEFORE UPDATE ON public.pdf_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pdf_documents_updated_at
  BEFORE UPDATE ON public.pdf_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pdf_analyses_updated_at
  BEFORE UPDATE ON public.pdf_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();