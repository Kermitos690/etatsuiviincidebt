-- Enable realtime for audit_alerts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_alerts;

-- Add index for faster filtering on unresolved alerts
CREATE INDEX IF NOT EXISTS idx_audit_alerts_unresolved 
ON public.audit_alerts (is_resolved, created_at DESC) 
WHERE is_resolved = false;

-- Enable realtime for incidents table
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;