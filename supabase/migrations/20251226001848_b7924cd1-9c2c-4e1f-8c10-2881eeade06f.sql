-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all access to emails" ON public.emails;
DROP POLICY IF EXISTS "Allow all access to gmail_config" ON public.gmail_config;
DROP POLICY IF EXISTS "Allow all access to incidents" ON public.incidents;
DROP POLICY IF EXISTS "Allow all access to sheets_config" ON public.sheets_config;

-- Create secure RLS policies for emails table
CREATE POLICY "Authenticated users can read emails"
ON public.emails FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert emails"
ON public.emails FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update emails"
ON public.emails FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete emails"
ON public.emails FOR DELETE
TO authenticated
USING (true);

-- Create secure RLS policies for gmail_config table
CREATE POLICY "Authenticated users can read gmail_config"
ON public.gmail_config FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert gmail_config"
ON public.gmail_config FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update gmail_config"
ON public.gmail_config FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete gmail_config"
ON public.gmail_config FOR DELETE
TO authenticated
USING (true);

-- Create secure RLS policies for incidents table
CREATE POLICY "Authenticated users can read incidents"
ON public.incidents FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert incidents"
ON public.incidents FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update incidents"
ON public.incidents FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete incidents"
ON public.incidents FOR DELETE
TO authenticated
USING (true);

-- Create secure RLS policies for sheets_config table
CREATE POLICY "Authenticated users can read sheets_config"
ON public.sheets_config FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert sheets_config"
ON public.sheets_config FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update sheets_config"
ON public.sheets_config FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete sheets_config"
ON public.sheets_config FOR DELETE
TO authenticated
USING (true);

-- Allow service role (Edge Functions) to bypass RLS
-- This is needed for edge functions that use service role key