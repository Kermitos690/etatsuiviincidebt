-- Add application-level encryption columns for Gmail OAuth tokens
-- Tokens will be stored encrypted by backend functions using a server-side secret key.

ALTER TABLE public.gmail_config
  ADD COLUMN IF NOT EXISTS access_token_enc text,
  ADD COLUMN IF NOT EXISTS refresh_token_enc text,
  ADD COLUMN IF NOT EXISTS token_nonce text,
  ADD COLUMN IF NOT EXISTS token_key_version integer NOT NULL DEFAULT 1;

-- Allow legacy plaintext access_token to be nulled out after migration.
ALTER TABLE public.gmail_config
  ALTER COLUMN access_token DROP NOT NULL;

COMMENT ON COLUMN public.gmail_config.access_token_enc IS 'Encrypted Gmail OAuth access token (base64). Written/read only by backend functions.';
COMMENT ON COLUMN public.gmail_config.refresh_token_enc IS 'Encrypted Gmail OAuth refresh token (base64). Written/read only by backend functions.';
COMMENT ON COLUMN public.gmail_config.token_nonce IS 'Nonce/IV for token encryption (base64).';
COMMENT ON COLUMN public.gmail_config.token_key_version IS 'Key version for token encryption to support rotation.';