-- Enable RLS but only allow service role access (no user access)
ALTER TABLE public.debug_guardrails ENABLE ROW LEVEL SECURITY;

-- No policies = no access for anon/authenticated users
-- Service role bypasses RLS automatically