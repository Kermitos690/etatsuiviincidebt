-- Table pour suivre le statut de synchronisation
CREATE TABLE public.sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'error')),
  total_emails int DEFAULT 0,
  processed_emails int DEFAULT 0,
  new_emails int DEFAULT 0,
  stats jsonb DEFAULT '{}',
  error_message text,
  last_processed_id text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can read sync_status" 
ON public.sync_status FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert sync_status" 
ON public.sync_status FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update sync_status" 
ON public.sync_status FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete sync_status" 
ON public.sync_status FOR DELETE USING (true);