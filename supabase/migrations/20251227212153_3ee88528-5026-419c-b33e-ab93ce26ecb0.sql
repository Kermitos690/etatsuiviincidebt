-- Create table for storing legal search results (cached searches)
CREATE TABLE public.legal_search_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('jurisprudence', 'legislation', 'doctrine')),
  source_name TEXT NOT NULL, -- bger.ch, fedlex.admin.ch, etc.
  source_url TEXT NOT NULL,
  title TEXT NOT NULL,
  reference_number TEXT, -- ATF 142 III 617, CC 390, etc.
  summary TEXT,
  full_content TEXT,
  date_decision DATE,
  legal_domain TEXT,
  keywords TEXT[],
  relevance_score NUMERIC,
  is_saved BOOLEAN DEFAULT FALSE,
  scraped_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.legal_search_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own search results"
ON public.legal_search_results FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search results"
ON public.legal_search_results FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own search results"
ON public.legal_search_results FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search results"
ON public.legal_search_results FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_legal_search_results_user_id ON public.legal_search_results(user_id);
CREATE INDEX idx_legal_search_results_query ON public.legal_search_results(search_query);
CREATE INDEX idx_legal_search_results_source_type ON public.legal_search_results(source_type);
CREATE INDEX idx_legal_search_results_is_saved ON public.legal_search_results(is_saved) WHERE is_saved = TRUE;

-- Updated at trigger
CREATE TRIGGER update_legal_search_results_updated_at
BEFORE UPDATE ON public.legal_search_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();