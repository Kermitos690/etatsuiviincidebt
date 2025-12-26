-- Supprimer les anciens cron jobs qui utilisent l'anon key
SELECT cron.unschedule('daily-backup');
SELECT cron.unschedule('daily-monitoring');

-- Recréer les cron jobs avec le secret interne
-- Note: Le secret INTERNAL_CRON_SECRET doit être défini dans Supabase secrets

-- Daily backup at 2:00 AM UTC using internal secret
SELECT cron.schedule(
  'daily-backup-secure',
  '0 2 * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://csysnvkvnoghhyqaxdkz.supabase.co/functions/v1/internal-backup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', current_setting('app.settings.internal_cron_secret', true)
    ),
    body := jsonb_build_object(
      'format', 'json',
      'tables', ARRAY['incidents', 'emails', 'email_attachments', 'thread_analyses']
    )
  );
  $$
);

-- Daily monitoring at 6:00 AM UTC using internal secret
SELECT cron.schedule(
  'daily-monitoring-secure',
  '0 6 * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://csysnvkvnoghhyqaxdkz.supabase.co/functions/v1/internal-monitoring',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', current_setting('app.settings.internal_cron_secret', true)
    ),
    body := jsonb_build_object(
      'action', 'health-check'
    )
  );
  $$
);