-- Add unique constraint on pdf_analyses.document_id for upsert operations
ALTER TABLE public.pdf_analyses
ADD CONSTRAINT pdf_analyses_document_id_unique UNIQUE (document_id);

-- Add index for better performance on tags search
CREATE INDEX IF NOT EXISTS idx_pdf_documents_tags ON public.pdf_documents USING GIN(tags);