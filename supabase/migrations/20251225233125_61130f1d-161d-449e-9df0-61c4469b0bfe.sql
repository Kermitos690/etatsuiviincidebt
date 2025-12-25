-- Enable the pg_net extension for HTTP calls from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to sync incident to Google Sheets
CREATE OR REPLACE FUNCTION public.sync_incident_to_sheets()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get Supabase URL and key from settings
  supabase_url := 'https://csysnvkvnoghhyqaxdkz.supabase.co';
  
  -- Call the sheets-sync edge function
  PERFORM extensions.http_post(
    url := supabase_url || '/functions/v1/sheets-sync',
    body := json_build_object(
      'action', 'sync-incident',
      'incidentId', NEW.id
    )::text,
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    )::jsonb
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to sync to Google Sheets: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic sync on insert/update
DROP TRIGGER IF EXISTS trigger_sync_incident_sheets ON public.incidents;
CREATE TRIGGER trigger_sync_incident_sheets
  AFTER INSERT OR UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_incident_to_sheets();