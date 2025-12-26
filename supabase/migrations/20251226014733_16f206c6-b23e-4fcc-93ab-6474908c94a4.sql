-- Add columns to emails table for complete email tracking
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS is_sent boolean DEFAULT false;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS recipient text;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS email_type text DEFAULT 'received';

-- Add comment for documentation
COMMENT ON COLUMN public.emails.is_sent IS 'True if email was sent by user, false if received';
COMMENT ON COLUMN public.emails.recipient IS 'Email recipient (To: header) for sent emails';
COMMENT ON COLUMN public.emails.email_type IS 'Type: received, sent, replied, forwarded';