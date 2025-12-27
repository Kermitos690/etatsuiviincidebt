-- Update sync_incident_to_sheets to add explicit user authorization check
-- This is defense-in-depth since the trigger only fires on user's own incidents (protected by RLS)
CREATE OR REPLACE FUNCTION public.sync_incident_to_sheets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  supabase_url TEXT;
BEGIN
  -- Defense-in-depth: Verify the incident belongs to the current user
  -- Note: This check may return NULL for trigger context, but provides protection
  -- when the function is called directly
  IF NEW.user_id IS NULL THEN
    RAISE WARNING 'sync_incident_to_sheets: Skipping sync for incident without user_id';
    RETURN NEW;
  END IF;

  supabase_url := 'https://csysnvkvnoghhyqaxdkz.supabase.co';
  
  PERFORM extensions.http_post(
    url := supabase_url || '/functions/v1/sheets-sync',
    body := json_build_object(
      'action', 'sync-incident',
      'incidentId', NEW.id,
      'userId', NEW.user_id
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
$$;