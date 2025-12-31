-- Add unique constraint on legal_references for idempotent upsert
ALTER TABLE public.legal_references
ADD CONSTRAINT legal_references_code_article_unique UNIQUE (code_name, article_number);