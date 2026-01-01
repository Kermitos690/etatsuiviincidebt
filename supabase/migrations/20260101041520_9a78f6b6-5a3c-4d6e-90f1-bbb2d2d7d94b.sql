-- SÉCURITÉ: Supprimer les colonnes de tokens en clair de gmail_config
-- Les tokens chiffrés (access_token_enc, refresh_token_enc) sont déjà utilisés

-- D'abord, vérifier que les tokens sont bien migrés vers les colonnes chiffrées
-- Note: Cette migration est sécuritaire car le code utilise déjà les colonnes _enc

-- Supprimer les colonnes de tokens en clair (CRITIQUE)
ALTER TABLE public.gmail_config DROP COLUMN IF EXISTS access_token;
ALTER TABLE public.gmail_config DROP COLUMN IF EXISTS refresh_token;

-- Renforcer RLS sur actor_trust_scores pour empêcher l'accès aux emails d'autres utilisateurs
DROP POLICY IF EXISTS "Users can view their own actor trust scores" ON public.actor_trust_scores;
CREATE POLICY "Users can view their own actor trust scores" 
ON public.actor_trust_scores 
FOR SELECT 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own actor trust scores" ON public.actor_trust_scores;
CREATE POLICY "Users can insert their own actor trust scores" 
ON public.actor_trust_scores 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own actor trust scores" ON public.actor_trust_scores;
CREATE POLICY "Users can update their own actor trust scores" 
ON public.actor_trust_scores 
FOR UPDATE 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own actor trust scores" ON public.actor_trust_scores;
CREATE POLICY "Users can delete their own actor trust scores" 
ON public.actor_trust_scores 
FOR DELETE 
USING (user_id = auth.uid());

-- Renforcer RLS sur audit_log pour filtrer les valeurs sensibles
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_log;
CREATE POLICY "Users can view their own audit logs" 
ON public.audit_log 
FOR SELECT 
USING (performed_by = auth.uid());