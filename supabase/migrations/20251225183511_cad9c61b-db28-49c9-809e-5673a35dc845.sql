-- Table pour stocker les emails reçus
CREATE TABLE public.emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  sender TEXT NOT NULL,
  body TEXT NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed BOOLEAN NOT NULL DEFAULT false,
  ai_analysis JSONB,
  incident_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for now (public webhook)
CREATE POLICY "Allow all access to emails" ON public.emails FOR ALL USING (true) WITH CHECK (true);

-- Table pour les incidents (avec les vraies données)
CREATE TABLE public.incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero SERIAL,
  date_incident DATE NOT NULL,
  date_creation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  institution TEXT NOT NULL,
  type TEXT NOT NULL,
  gravite TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'Ouvert',
  titre TEXT NOT NULL,
  faits TEXT NOT NULL,
  dysfonctionnement TEXT NOT NULL,
  transmis_jp BOOLEAN NOT NULL DEFAULT false,
  date_transmission_jp DATE,
  preuves JSONB DEFAULT '[]'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  priorite TEXT NOT NULL DEFAULT 'faible',
  email_source_id UUID REFERENCES public.emails(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all access for now
CREATE POLICY "Allow all access to incidents" ON public.incidents FOR ALL USING (true) WITH CHECK (true);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();