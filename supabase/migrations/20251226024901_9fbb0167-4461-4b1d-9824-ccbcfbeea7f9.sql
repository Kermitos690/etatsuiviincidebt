-- Create storage bucket for email attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-attachments', 
  'email-attachments', 
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv', 'application/rtf']
);

-- Storage policies for attachments
CREATE POLICY "Authenticated users can view attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-attachments');

CREATE POLICY "Service role can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'email-attachments');

CREATE POLICY "Service role can delete attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'email-attachments');

-- Create attachments tracking table
CREATE TABLE public.email_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  gmail_attachment_id TEXT,
  ai_analysis JSONB,
  analyzed_at TIMESTAMP WITH TIME ZONE,
  extracted_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read attachments"
ON public.email_attachments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert attachments"
ON public.email_attachments FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update attachments"
ON public.email_attachments FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete attachments"
ON public.email_attachments FOR DELETE
USING (true);

-- Index for faster lookups
CREATE INDEX idx_email_attachments_email_id ON public.email_attachments(email_id);
CREATE INDEX idx_email_attachments_analyzed ON public.email_attachments(analyzed_at) WHERE analyzed_at IS NULL;