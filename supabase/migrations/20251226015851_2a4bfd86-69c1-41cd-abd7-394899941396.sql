-- Table pour stocker les rapports mensuels générés
CREATE TABLE public.monthly_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month_year TEXT NOT NULL, -- Format: "2024-01"
  report_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  incidents_count INTEGER NOT NULL DEFAULT 0,
  emails_count INTEGER NOT NULL DEFAULT 0,
  violations_count INTEGER NOT NULL DEFAULT 0,
  cumulative_score INTEGER NOT NULL DEFAULT 0,
  severity_breakdown JSONB DEFAULT '{}',
  institution_breakdown JSONB DEFAULT '{}',
  legal_references JSONB DEFAULT '[]',
  summary TEXT,
  key_issues JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les alertes d'urgence
CREATE TABLE public.audit_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL, -- 'critical_incident', 'recurring_violation', 'deadline_breach', 'pattern_detected'
  severity TEXT NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  related_incident_id UUID REFERENCES public.incidents(id),
  related_email_id UUID REFERENCES public.emails(id),
  legal_reference JSONB,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour le suivi des récidives par institution
CREATE TABLE public.recurrence_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  first_occurrence DATE NOT NULL,
  last_occurrence DATE NOT NULL,
  related_incidents JSONB DEFAULT '[]', -- Array of incident IDs
  legal_implications TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(institution, violation_type)
);

-- Enable RLS
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurrence_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for monthly_reports
CREATE POLICY "Authenticated users can read monthly_reports" 
ON public.monthly_reports FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert monthly_reports" 
ON public.monthly_reports FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update monthly_reports" 
ON public.monthly_reports FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete monthly_reports" 
ON public.monthly_reports FOR DELETE USING (true);

-- RLS Policies for audit_alerts
CREATE POLICY "Authenticated users can read audit_alerts" 
ON public.audit_alerts FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert audit_alerts" 
ON public.audit_alerts FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update audit_alerts" 
ON public.audit_alerts FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete audit_alerts" 
ON public.audit_alerts FOR DELETE USING (true);

-- RLS Policies for recurrence_tracking
CREATE POLICY "Authenticated users can read recurrence_tracking" 
ON public.recurrence_tracking FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert recurrence_tracking" 
ON public.recurrence_tracking FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update recurrence_tracking" 
ON public.recurrence_tracking FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete recurrence_tracking" 
ON public.recurrence_tracking FOR DELETE USING (true);

-- Trigger for updated_at on recurrence_tracking
CREATE TRIGGER update_recurrence_tracking_updated_at
BEFORE UPDATE ON public.recurrence_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();