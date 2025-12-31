-- Table for durable debug guardrails (rate-limit + seed cooldown)
-- Only used when debug_persist=true (strictly opt-in)
CREATE TABLE public.debug_guardrails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,  -- 'debug' or 'seed'
  key_hash text NOT NULL,  -- hash(ip + queryHash + salt) - no raw IP stored
  window_start timestamptz NOT NULL,
  window_ms int NOT NULL,
  count int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint for atomic upserts
CREATE UNIQUE INDEX idx_debug_guardrails_unique 
ON public.debug_guardrails (scope, key_hash, window_start);

-- Index for cleanup queries
CREATE INDEX idx_debug_guardrails_window_start 
ON public.debug_guardrails (window_start);

-- Disable RLS - service role only from edge function
ALTER TABLE public.debug_guardrails DISABLE ROW LEVEL SECURITY;

-- Auto-cleanup old entries (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_debug_guardrails()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.debug_guardrails 
  WHERE window_start < now() - interval '1 hour';
$$;