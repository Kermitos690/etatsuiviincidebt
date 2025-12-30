-- Phase B: Security & Legal Credibility
-- 1. Add modification_reason and analysis_notes columns to incidents
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS modification_reason text,
ADD COLUMN IF NOT EXISTS analysis_notes text,
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;

-- 2. Create incident_events table for audit trail
CREATE TABLE IF NOT EXISTS public.incident_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('creation', 'update', 'transmission_jp', 'lock', 'unlock', 'status_change')),
  event_description text NOT NULL,
  changes jsonb DEFAULT '{}'::jsonb,
  modification_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Enable RLS on incident_events
ALTER TABLE public.incident_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for incident_events
CREATE POLICY "Users can view own incident events" 
  ON public.incident_events 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own incident events" 
  ON public.incident_events 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- No UPDATE or DELETE allowed on incident_events (immutable audit trail)

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_incident_events_incident_id ON public.incident_events(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_events_created_at ON public.incident_events(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE public.incident_events IS 'Immutable audit trail for incident lifecycle events';
COMMENT ON COLUMN public.incidents.modification_reason IS 'Optional reason for the last modification';
COMMENT ON COLUMN public.incidents.analysis_notes IS 'AI analysis notes - separate from factual content';
COMMENT ON COLUMN public.incidents.is_locked IS 'Lock flag when incident is transmitted to JP';