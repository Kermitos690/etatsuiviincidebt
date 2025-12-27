-- =============================================
-- 1. Créer la table app_settings
-- =============================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policies: lecture publique pour les settings globaux, écriture admin
CREATE POLICY "Public settings are viewable by authenticated users"
ON public.app_settings
FOR SELECT
TO authenticated
USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can insert their own settings"
ON public.app_settings
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR (user_id IS NULL AND has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Users can update their own settings"
ON public.app_settings
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR (user_id IS NULL AND has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Only admins can delete global settings"
ON public.app_settings
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR (user_id IS NULL AND has_role(auth.uid(), 'admin'::app_role)));

-- Trigger pour updated_at
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 2. Ajouter dedup_key à incidents
-- =============================================
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS dedup_key TEXT;

-- Créer un index unique partiel (uniquement quand non null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_incidents_dedup_key_unique 
ON public.incidents(dedup_key) 
WHERE dedup_key IS NOT NULL;

-- =============================================
-- 3. Fonction business_days_between
-- =============================================
CREATE OR REPLACE FUNCTION public.business_days_between(a DATE, b DATE)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT count(*)::int
     FROM generate_series(a + 1, b, interval '1 day') d(day)
     WHERE extract(isodow FROM d.day) BETWEEN 1 AND 5),
    0
  );
$$;

-- =============================================
-- 4. Fonction get_last_curatelle_contact
-- =============================================
CREATE OR REPLACE FUNCTION public.get_last_curatelle_contact(
  p_user_id UUID,
  p_curatelle_emails TEXT[]
)
RETURNS TABLE(
  last_contact_at TIMESTAMPTZ, 
  contact_sender TEXT, 
  contact_recipient TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lower_emails TEXT[];
BEGIN
  -- Convertir en minuscules pour comparaison insensible à la casse
  SELECT array_agg(LOWER(TRIM(e))) INTO v_lower_emails
  FROM unnest(p_curatelle_emails) AS e;
  
  RETURN QUERY
  SELECT 
    e.received_at AS last_contact_at,
    e.sender AS contact_sender,
    e.recipient AS contact_recipient
  FROM emails e
  WHERE e.user_id = p_user_id
    AND (
      LOWER(TRIM(e.sender)) = ANY(v_lower_emails)
      OR LOWER(TRIM(e.recipient)) = ANY(v_lower_emails)
    )
  ORDER BY e.received_at DESC NULLS LAST
  LIMIT 1;
END;
$$;

-- =============================================
-- 5. Fonction get_users_with_gmail_sync
-- =============================================
CREATE OR REPLACE FUNCTION public.get_users_with_gmail_sync()
RETURNS TABLE(user_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT gc.user_id
  FROM gmail_config gc
  WHERE gc.sync_enabled = true
    AND gc.user_id IS NOT NULL;
$$;