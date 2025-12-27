-- Add DELETE policy for admins only on legal_articles
CREATE POLICY "Only admins can delete legal articles"
ON public.legal_articles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add audit trigger for legal_articles modifications
CREATE TRIGGER audit_legal_articles_changes
AFTER INSERT OR UPDATE OR DELETE ON public.legal_articles
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger_function();

-- Add integrity check constraint for legal articles
ALTER TABLE public.legal_articles
ADD CONSTRAINT check_article_not_empty 
CHECK (length(trim(article_text)) > 10);

ALTER TABLE public.legal_articles
ADD CONSTRAINT check_article_number_format 
CHECK (article_number ~ '^[0-9]+[a-z]*$' OR article_number ~ '^Art\.');

-- Create index for faster audit lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_legal_articles 
ON public.audit_log(table_name, performed_at) 
WHERE table_name = 'legal_articles';