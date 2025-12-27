-- =============================================
-- PHASE 1: RÉFÉRENTIEL LÉGAL VERSIONNÉ
-- =============================================

CREATE TABLE public.legal_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_name TEXT NOT NULL, -- ex: 'CC', 'LPD', 'LPPA-VD', 'CSIAS'
  article_number TEXT NOT NULL, -- ex: '8', '13.1', '388'
  article_title TEXT,
  article_text TEXT NOT NULL,
  domain TEXT, -- 'protection_adulte', 'protection_donnees', 'procedure'
  keywords TEXT[] DEFAULT '{}',
  version_number INTEGER NOT NULL DEFAULT 1,
  version_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_url TEXT,
  source_document TEXT,
  content_hash TEXT NOT NULL, -- SHA-256 du contenu pour intégrité
  is_current BOOLEAN DEFAULT TRUE,
  previous_version_id UUID REFERENCES public.legal_articles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id),
  UNIQUE(code_name, article_number, version_number)
);

ALTER TABLE public.legal_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all legal articles"
ON public.legal_articles FOR SELECT
USING (true);

CREATE POLICY "Users can insert own legal articles"
ON public.legal_articles FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own legal articles"
ON public.legal_articles FOR UPDATE
USING (user_id = auth.uid());

CREATE INDEX idx_legal_articles_code ON public.legal_articles(code_name, article_number);
CREATE INDEX idx_legal_articles_keywords ON public.legal_articles USING GIN(keywords);
CREATE INDEX idx_legal_articles_domain ON public.legal_articles(domain);
CREATE INDEX idx_legal_articles_current ON public.legal_articles(is_current) WHERE is_current = true;

-- =============================================
-- PHASE 2: MAPPINGS FAITS ↔ ARTICLES LÉGAUX
-- =============================================

CREATE TABLE public.fact_law_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fact_id UUID, -- Référence flexible vers email_facts, incidents, etc.
  fact_type TEXT NOT NULL, -- 'email_fact', 'incident', 'corroboration'
  fact_text TEXT NOT NULL, -- Extrait du fait concerné
  legal_article_id UUID NOT NULL REFERENCES public.legal_articles(id),
  relevance_score NUMERIC(3,2) CHECK (relevance_score >= 0 AND relevance_score <= 1),
  mapping_type TEXT NOT NULL DEFAULT 'potential', -- 'potential', 'confirmed', 'rejected'
  mapping_reason TEXT, -- Explication du lien
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_confidence NUMERIC(3,2),
  validated_by TEXT, -- 'user', 'system', null si non validé
  validated_at TIMESTAMP WITH TIME ZONE,
  validation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE public.fact_law_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fact_law_mappings"
ON public.fact_law_mappings FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own fact_law_mappings"
ON public.fact_law_mappings FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own fact_law_mappings"
ON public.fact_law_mappings FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own fact_law_mappings"
ON public.fact_law_mappings FOR DELETE
USING (user_id = auth.uid());

CREATE INDEX idx_fact_law_mappings_fact ON public.fact_law_mappings(fact_id, fact_type);
CREATE INDEX idx_fact_law_mappings_article ON public.fact_law_mappings(legal_article_id);
CREATE INDEX idx_fact_law_mappings_type ON public.fact_law_mappings(mapping_type);

-- =============================================
-- PHASE 3: CHAÎNE DE PREUVE (INTÉGRITÉ CRYPTO)
-- =============================================

CREATE TABLE public.proof_chain (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'email', 'incident', 'attachment', 'legal_mapping'
  entity_id UUID NOT NULL,
  content_hash TEXT NOT NULL, -- SHA-256 du contenu original
  metadata_hash TEXT, -- SHA-256 des métadonnées
  combined_hash TEXT NOT NULL, -- Hash combiné pour vérification
  previous_proof_id UUID REFERENCES public.proof_chain(id), -- Chaînage
  chain_position INTEGER NOT NULL DEFAULT 1,
  sealed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sealed_by TEXT NOT NULL, -- 'system', 'user', 'edge_function'
  seal_reason TEXT, -- 'creation', 'update', 'export', 'verification'
  verification_status TEXT DEFAULT 'valid', -- 'valid', 'invalid', 'pending'
  last_verified_at TIMESTAMP WITH TIME ZONE,
  source_ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id),
  UNIQUE(entity_type, entity_id, chain_position)
);

ALTER TABLE public.proof_chain ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proof_chain"
ON public.proof_chain FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own proof_chain"
ON public.proof_chain FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_proof_chain_entity ON public.proof_chain(entity_type, entity_id);
CREATE INDEX idx_proof_chain_hash ON public.proof_chain(combined_hash);
CREATE INDEX idx_proof_chain_sealed ON public.proof_chain(sealed_at);

-- =============================================
-- PHASE 4: AUDIT TRAIL COMPLET
-- =============================================

CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  performed_by UUID, -- user_id si authentifié
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  context JSONB DEFAULT '{}'::jsonb -- Contexte additionnel
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Lecture seule pour l'utilisateur propriétaire des données
CREATE POLICY "Users can view audit logs of own data"
ON public.audit_log FOR SELECT
USING (performed_by = auth.uid());

-- Insertion uniquement par système (triggers)
CREATE POLICY "System can insert audit logs"
ON public.audit_log FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_audit_log_table ON public.audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_operation ON public.audit_log(operation);
CREATE INDEX idx_audit_log_performed_at ON public.audit_log(performed_at);
CREATE INDEX idx_audit_log_user ON public.audit_log(performed_by);

-- =============================================
-- PHASE 5: VALIDATION SORTIES IA
-- =============================================

CREATE TABLE public.ai_output_validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edge_function_name TEXT NOT NULL, -- 'analyze-thread', 'match-facts-to-law', etc.
  input_hash TEXT NOT NULL, -- Hash des données d'entrée
  output_hash TEXT NOT NULL, -- Hash de la sortie IA
  raw_output JSONB NOT NULL, -- Sortie brute de l'IA
  validated_output JSONB, -- Sortie après validation
  legal_refs_claimed TEXT[], -- Références citées par l'IA
  legal_refs_verified TEXT[], -- Références vérifiées dans le référentiel
  legal_refs_rejected TEXT[], -- Références non trouvées
  hallucination_detected BOOLEAN DEFAULT FALSE,
  hallucination_details JSONB,
  validation_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'valid', 'corrected', 'rejected'
  validation_rules_applied TEXT[],
  confidence_before NUMERIC(3,2),
  confidence_after NUMERIC(3,2),
  processing_time_ms INTEGER,
  model_used TEXT,
  prompt_version TEXT,
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE public.ai_output_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai_output_validations"
ON public.ai_output_validations FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own ai_output_validations"
ON public.ai_output_validations FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_ai_validations_function ON public.ai_output_validations(edge_function_name);
CREATE INDEX idx_ai_validations_status ON public.ai_output_validations(validation_status);
CREATE INDEX idx_ai_validations_hallucination ON public.ai_output_validations(hallucination_detected);

-- =============================================
-- PHASE 6: ÉVALUATIONS DE CONFORMITÉ
-- =============================================

CREATE TABLE public.compliance_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'incident', 'email', 'thread'
  entity_id UUID NOT NULL,
  assessment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  overall_score NUMERIC(5,2) CHECK (overall_score >= 0 AND overall_score <= 100),
  risk_level TEXT NOT NULL DEFAULT 'undetermined', -- 'low', 'medium', 'high', 'critical', 'undetermined'
  compliance_status TEXT NOT NULL DEFAULT 'pending', -- 'compliant', 'non_compliant', 'partially_compliant', 'pending', 'undetermined'
  
  -- Scores détaillés par domaine
  legal_basis_score NUMERIC(3,2), -- Score base légale (0-1)
  procedural_score NUMERIC(3,2), -- Score procédural
  data_protection_score NUMERIC(3,2), -- Score protection données
  documentation_score NUMERIC(3,2), -- Score documentation
  
  -- Analyse
  issues_detected JSONB DEFAULT '[]'::jsonb, -- Liste des problèmes
  red_zones JSONB DEFAULT '[]'::jsonb, -- Zones critiques
  recommendations JSONB DEFAULT '[]'::jsonb, -- Recommandations
  
  -- Traçabilité
  legal_mappings_used UUID[], -- IDs des fact_law_mappings utilisés
  ai_validation_id UUID REFERENCES public.ai_output_validations(id),
  proof_chain_id UUID REFERENCES public.proof_chain(id),
  
  -- Métadonnées
  assessed_by TEXT NOT NULL DEFAULT 'system', -- 'system', 'user'
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id),
  
  UNIQUE(entity_type, entity_id, assessment_date)
);

ALTER TABLE public.compliance_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own compliance_assessments"
ON public.compliance_assessments FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own compliance_assessments"
ON public.compliance_assessments FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own compliance_assessments"
ON public.compliance_assessments FOR UPDATE
USING (user_id = auth.uid());

CREATE INDEX idx_compliance_entity ON public.compliance_assessments(entity_type, entity_id);
CREATE INDEX idx_compliance_risk ON public.compliance_assessments(risk_level);
CREATE INDEX idx_compliance_status ON public.compliance_assessments(compliance_status);
CREATE INDEX idx_compliance_date ON public.compliance_assessments(assessment_date);

-- =============================================
-- TRIGGERS D'AUDIT TRAIL
-- =============================================

-- Fonction générique d'audit
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  changed TEXT[];
  key_name TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
    INSERT INTO public.audit_log (table_name, record_id, operation, old_values, performed_by)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, old_data, auth.uid());
    RETURN OLD;
    
  ELSIF TG_OP = 'UPDATE' THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    
    -- Identifier les champs modifiés
    FOR key_name IN SELECT jsonb_object_keys(new_data) LOOP
      IF old_data->key_name IS DISTINCT FROM new_data->key_name THEN
        changed := array_append(changed, key_name);
      END IF;
    END LOOP;
    
    INSERT INTO public.audit_log (table_name, record_id, operation, old_values, new_values, changed_fields, performed_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, old_data, new_data, changed, auth.uid());
    RETURN NEW;
    
  ELSIF TG_OP = 'INSERT' THEN
    new_data := to_jsonb(NEW);
    INSERT INTO public.audit_log (table_name, record_id, operation, new_values, performed_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, new_data, auth.uid());
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Appliquer les triggers aux tables sensibles
CREATE TRIGGER audit_incidents
  AFTER INSERT OR UPDATE OR DELETE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_emails
  AFTER INSERT OR UPDATE OR DELETE ON public.emails
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_legal_articles
  AFTER INSERT OR UPDATE OR DELETE ON public.legal_articles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_fact_law_mappings
  AFTER INSERT OR UPDATE OR DELETE ON public.fact_law_mappings
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_compliance_assessments
  AFTER INSERT OR UPDATE OR DELETE ON public.compliance_assessments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_corroborations
  AFTER INSERT OR UPDATE OR DELETE ON public.corroborations
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Trigger updated_at pour les nouvelles tables
CREATE TRIGGER update_legal_articles_updated_at
  BEFORE UPDATE ON public.legal_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fact_law_mappings_updated_at
  BEFORE UPDATE ON public.fact_law_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_assessments_updated_at
  BEFORE UPDATE ON public.compliance_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();