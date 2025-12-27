-- Create pdf_comparisons table to store comparison results
CREATE TABLE public.pdf_comparisons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id_1 UUID NOT NULL REFERENCES public.pdf_documents(id) ON DELETE CASCADE,
  document_id_2 UUID NOT NULL REFERENCES public.pdf_documents(id) ON DELETE CASCADE,
  comparison_result JSONB,
  similarity_score NUMERIC(5,4),
  contradictions_count INTEGER DEFAULT 0,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pdf_comparisons ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own comparisons"
  ON public.pdf_comparisons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own comparisons"
  ON public.pdf_comparisons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comparisons"
  ON public.pdf_comparisons FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_pdf_comparisons_documents ON public.pdf_comparisons(document_id_1, document_id_2);
CREATE INDEX idx_pdf_comparisons_user ON public.pdf_comparisons(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_pdf_comparisons_updated_at
  BEFORE UPDATE ON public.pdf_comparisons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();