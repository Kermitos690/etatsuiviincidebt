-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage on cron schema
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule daily backup at 2:00 AM UTC
SELECT cron.schedule(
  'daily-backup',
  '0 2 * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://csysnvkvnoghhyqaxdkz.supabase.co/functions/v1/backup-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeXNudmt2bm9naGh5cWF4ZGt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NTYxMTIsImV4cCI6MjA4MjIzMjExMn0.sjYPn2i7qXI2x9l7y49CCb256KmFsjh0zDxy-Xe8Gxo'
    ),
    body := jsonb_build_object(
      'format', 'json',
      'tables', ARRAY['incidents', 'emails', 'email_attachments', 'thread_analyses']
    )
  );
  $$
);

-- Schedule daily monitoring at 6:00 AM UTC
SELECT cron.schedule(
  'daily-monitoring',
  '0 6 * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://csysnvkvnoghhyqaxdkz.supabase.co/functions/v1/monitoring-logs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeXNudmt2bm9naGh5cWF4ZGt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NTYxMTIsImV4cCI6MjA4MjIzMjExMn0.sjYPn2i7qXI2x9l7y49CCb256KmFsjh0zDxy-Xe8Gxo'
    ),
    body := jsonb_build_object(
      'action', 'health-check'
    )
  );
  $$
);