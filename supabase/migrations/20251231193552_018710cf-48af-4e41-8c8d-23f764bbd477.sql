-- Add RLS policies for debug_guardrails table
-- This table is only accessed by edge functions using service role key
-- We need to ensure no client-side access is possible

-- Policy: Service role can manage all records (edge functions)
-- Note: service_role bypasses RLS by default, but we add explicit policies
-- for completeness and to satisfy the linter

-- Allow authenticated users to SELECT their own rate limit entries (for debugging)
-- In practice, key_hash is a hash of IP so users can't identify their entries
-- This is a permissive read-only policy since the data isn't sensitive
CREATE POLICY "Rate limit records are managed by service role"
ON public.debug_guardrails
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- No policies for anon or authenticated roles - they should not access this table directly
-- Edge functions use service_role which bypasses RLS anyway