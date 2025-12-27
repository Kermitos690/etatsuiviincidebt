-- Create email_blacklist table for blocking future imports
CREATE TABLE public.email_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  domain TEXT,
  sender_email TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_blacklist ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own blacklist"
ON public.email_blacklist
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own blacklist"
ON public.email_blacklist
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own blacklist"
ON public.email_blacklist
FOR DELETE
USING (user_id = auth.uid());

-- Create index for fast lookup
CREATE INDEX idx_email_blacklist_user_domain ON public.email_blacklist(user_id, domain);
CREATE INDEX idx_email_blacklist_user_sender ON public.email_blacklist(user_id, sender_email);