-- Add tags column to pdf_documents
ALTER TABLE public.pdf_documents 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create index for tags search
CREATE INDEX IF NOT EXISTS idx_pdf_documents_tags ON public.pdf_documents USING GIN(tags);

-- Create index for document_type search
CREATE INDEX IF NOT EXISTS idx_pdf_documents_type ON public.pdf_documents(document_type);

-- Create index for created_at search
CREATE INDEX IF NOT EXISTS idx_pdf_documents_created_at ON public.pdf_documents(created_at DESC);