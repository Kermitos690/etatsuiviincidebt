-- Create gmail_config table for OAuth token persistence
CREATE TABLE public.gmail_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text,
  token_expiry timestamptz,
  domains text[] DEFAULT '{}',
  keywords text[] DEFAULT '{}',
  sync_enabled boolean DEFAULT false,
  last_sync timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on gmail_config
ALTER TABLE public.gmail_config ENABLE ROW LEVEL SECURITY;

-- Allow all access for now (app-level security)
CREATE POLICY "Allow all access to gmail_config"
ON public.gmail_config FOR ALL
USING (true)
WITH CHECK (true);

-- Create sheets_config table for Google Sheets configuration
CREATE TABLE public.sheets_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spreadsheet_id text,
  sheet_name text DEFAULT 'Incidents',
  column_mapping jsonb DEFAULT '{"numero": "A", "date_incident": "B", "institution": "C", "type": "D", "titre": "E", "gravite": "F", "statut": "G", "score": "H"}',
  sync_enabled boolean DEFAULT false,
  last_sync timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on sheets_config
ALTER TABLE public.sheets_config ENABLE ROW LEVEL SECURITY;

-- Allow all access for now (app-level security)
CREATE POLICY "Allow all access to sheets_config"
ON public.sheets_config FOR ALL
USING (true)
WITH CHECK (true);

-- Add missing columns to emails table
ALTER TABLE public.emails 
ADD COLUMN IF NOT EXISTS gmail_message_id text UNIQUE,
ADD COLUMN IF NOT EXISTS gmail_thread_id text,
ADD COLUMN IF NOT EXISTS thread_analysis jsonb;

-- Add missing columns to incidents table
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS confidence_level text,
ADD COLUMN IF NOT EXISTS gmail_references jsonb DEFAULT '[]';

-- Create trigger for gmail_config updated_at
CREATE TRIGGER update_gmail_config_updated_at
BEFORE UPDATE ON public.gmail_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for sheets_config updated_at
CREATE TRIGGER update_sheets_config_updated_at
BEFORE UPDATE ON public.sheets_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();