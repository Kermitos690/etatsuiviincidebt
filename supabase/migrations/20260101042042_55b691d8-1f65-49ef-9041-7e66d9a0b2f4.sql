-- ============================================
-- SECURITY HARDENING: LEGAL DATA INTEGRITY
-- ============================================

-- 1. LEGAL_ARTICLES: Restrict write access to admin only
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Users can insert legal articles" ON public.legal_articles;
DROP POLICY IF EXISTS "Users can update their legal articles" ON public.legal_articles;
DROP POLICY IF EXISTS "Users can delete their legal articles" ON public.legal_articles;

-- Create admin-only write policies
CREATE POLICY "Admin can insert legal articles" ON public.legal_articles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update legal articles" ON public.legal_articles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete legal articles" ON public.legal_articles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. PROOF_CHAIN: Prevent modification/deletion (immutability)
DROP POLICY IF EXISTS "Users can update their proof chain" ON public.proof_chain;
DROP POLICY IF EXISTS "Users can delete their proof chain" ON public.proof_chain;

CREATE POLICY "Proof chain is immutable - no updates" ON public.proof_chain
  FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "Proof chain is immutable - no deletes" ON public.proof_chain
  FOR DELETE TO authenticated
  USING (false);

-- 3. AUDIT_LOG: Prevent user modification (only insert allowed via trigger)
DROP POLICY IF EXISTS "Users can update audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Users can delete audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Users can insert audit log" ON public.audit_log;

CREATE POLICY "Audit log is immutable - no updates" ON public.audit_log
  FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "Audit log is immutable - no deletes" ON public.audit_log
  FOR DELETE TO authenticated
  USING (false);

-- Only allow read of own audit entries
CREATE POLICY "Users can view their audit entries" ON public.audit_log
  FOR SELECT TO authenticated
  USING (performed_by = auth.uid());

-- 4. INCIDENTS: Block modifications when locked or transmitted
DROP POLICY IF EXISTS "Users can update their own incidents" ON public.incidents;

CREATE POLICY "Users can update unlocked incidents only" ON public.incidents
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() 
    AND (is_locked IS NULL OR is_locked = false)
    AND (transmis_jp IS NULL OR transmis_jp = false)
  );

-- 5. AI_OUTPUT_VALIDATIONS: Prevent tampering
DROP POLICY IF EXISTS "Users can update ai validations" ON public.ai_output_validations;
DROP POLICY IF EXISTS "Users can delete ai validations" ON public.ai_output_validations;

CREATE POLICY "AI validations are immutable - no updates" ON public.ai_output_validations
  FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "AI validations are immutable - no deletes" ON public.ai_output_validations
  FOR DELETE TO authenticated
  USING (false);

-- 6. COMPLIANCE_ASSESSMENTS: Prevent deletion
DROP POLICY IF EXISTS "Users can delete compliance assessments" ON public.compliance_assessments;

CREATE POLICY "Compliance assessments cannot be deleted" ON public.compliance_assessments
  FOR DELETE TO authenticated
  USING (false);