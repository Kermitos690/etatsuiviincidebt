-- Fix search_path security warning
CREATE OR REPLACE FUNCTION public.sync_incident_to_sheets()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
BEGIN
  supabase_url := 'https://csysnvkvnoghhyqaxdkz.supabase.co';
  
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
    RAISE WARNING 'Failed to sync to Google Sheets: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;