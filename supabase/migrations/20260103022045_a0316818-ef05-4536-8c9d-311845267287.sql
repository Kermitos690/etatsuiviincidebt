-- =====================================================
-- LEGAL KNOWLEDGE BASE - COMPLETE SCHEMA
-- Source de vérité pour toutes les bases légales CH/VD
-- =====================================================

-- 1. LEGAL INSTRUMENTS (Lois, ordonnances, règlements)
CREATE TABLE IF NOT EXISTS public.legal_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_uid TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  short_title TEXT,
  abbreviation TEXT,
  jurisdiction TEXT NOT NULL DEFAULT 'CH',
  domain_tags TEXT[] DEFAULT '{}',
  blv_or_rs_id TEXT,
  authority TEXT,
  instrument_type TEXT DEFAULT 'law',
  adoption_date DATE,
  entry_into_force DATE,
  current_status TEXT DEFAULT 'in_force',
  repealed_by_instrument_uid TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_legal_instruments_uid ON public.legal_instruments(instrument_uid);
CREATE INDEX idx_legal_instruments_jurisdiction ON public.legal_instruments(jurisdiction);
CREATE INDEX idx_legal_instruments_status ON public.legal_instruments(current_status);
CREATE INDEX idx_legal_instruments_domain ON public.legal_instruments USING GIN(domain_tags);
CREATE INDEX idx_legal_instruments_abbreviation ON public.legal_instruments(abbreviation);

-- 2. LEGAL VERSIONS (Versions consolidées)
CREATE TABLE IF NOT EXISTS public.legal_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID NOT NULL REFERENCES public.legal_instruments(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'in_force',
  valid_from DATE,
  valid_to DATE,
  consolidated_at TIMESTAMPTZ,
  source_set_hash TEXT,
  modification_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_legal_versions_instrument ON public.legal_versions(instrument_id);
CREATE INDEX idx_legal_versions_status ON public.legal_versions(status);
CREATE INDEX idx_legal_versions_dates ON public.legal_versions(valid_from, valid_to);
CREATE UNIQUE INDEX idx_legal_versions_unique ON public.legal_versions(instrument_id, version_number);

-- 3. LEGAL UNITS (Articles, alinéas, lettres)
CREATE TABLE IF NOT EXISTS public.legal_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.legal_versions(id) ON DELETE CASCADE,
  instrument_id UUID NOT NULL REFERENCES public.legal_instruments(id) ON DELETE CASCADE,
  cite_key TEXT NOT NULL,
  unit_type TEXT NOT NULL DEFAULT 'article',
  parent_unit_id UUID REFERENCES public.legal_units(id),
  order_index INTEGER DEFAULT 0,
  article_number TEXT,
  paragraph_number TEXT,
  letter TEXT,
  title TEXT,
  content_text TEXT NOT NULL,
  hash_sha256 TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  is_key_unit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_legal_units_version ON public.legal_units(version_id);
CREATE INDEX idx_legal_units_instrument ON public.legal_units(instrument_id);
CREATE INDEX idx_legal_units_cite_key ON public.legal_units(cite_key);
CREATE INDEX idx_legal_units_type ON public.legal_units(unit_type);
CREATE INDEX idx_legal_units_hash ON public.legal_units(hash_sha256);
CREATE INDEX idx_legal_units_keywords ON public.legal_units USING GIN(keywords);
CREATE INDEX idx_legal_units_content ON public.legal_units USING GIN(to_tsvector('french', content_text));

-- 4. LEGAL SOURCES (URLs officielles)
CREATE TABLE IF NOT EXISTS public.legal_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.legal_versions(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  source_type TEXT DEFAULT 'official',
  authority TEXT,
  format TEXT DEFAULT 'html',
  retrieved_at TIMESTAMPTZ DEFAULT NOW(),
  is_primary BOOLEAN DEFAULT false,
  checksum TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_legal_sources_version ON public.legal_sources(version_id);
CREATE INDEX idx_legal_sources_url ON public.legal_sources(source_url);

-- 5. LEGAL RELATIONS (Graphe de relations)
CREATE TABLE IF NOT EXISTS public.legal_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_instrument_id UUID NOT NULL REFERENCES public.legal_instruments(id) ON DELETE CASCADE,
  to_instrument_id UUID NOT NULL REFERENCES public.legal_instruments(id) ON DELETE CASCADE,
  from_unit_id UUID REFERENCES public.legal_units(id),
  to_unit_id UUID REFERENCES public.legal_units(id),
  relation_type TEXT NOT NULL,
  effective_date DATE,
  note TEXT,
  confidence NUMERIC DEFAULT 1.0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_legal_relations_from ON public.legal_relations(from_instrument_id);
CREATE INDEX idx_legal_relations_to ON public.legal_relations(to_instrument_id);
CREATE INDEX idx_legal_relations_type ON public.legal_relations(relation_type);

-- 6. INGESTION TRACKING
CREATE TABLE IF NOT EXISTS public.ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL DEFAULT 'full',
  jurisdiction_scope TEXT DEFAULT 'CH',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running',
  items_total INTEGER DEFAULT 0,
  items_success INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  items_skipped INTEGER DEFAULT 0,
  error_summary JSONB DEFAULT '[]',
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ingestion_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  instrument_uid TEXT,
  status TEXT DEFAULT 'pending',
  raw_content_hash TEXT,
  units_created INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ingestion_items_run ON public.ingestion_items(run_id);
CREATE INDEX idx_ingestion_items_status ON public.ingestion_items(status);

CREATE TABLE IF NOT EXISTS public.ingestion_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.ingestion_runs(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.ingestion_items(id) ON DELETE CASCADE,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  source_url TEXT,
  recoverable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. EMAIL LEGAL MENTIONS (Détections)
CREATE TABLE IF NOT EXISTS public.email_legal_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  user_id UUID,
  match_type TEXT NOT NULL,
  match_text TEXT NOT NULL,
  match_position INTEGER,
  confidence NUMERIC DEFAULT 0.5,
  instrument_id UUID REFERENCES public.legal_instruments(id),
  unit_id UUID REFERENCES public.legal_units(id),
  resolved BOOLEAN DEFAULT false,
  resolution_method TEXT,
  candidate_instruments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_legal_mentions_email ON public.email_legal_mentions(email_id);
CREATE INDEX idx_email_legal_mentions_instrument ON public.email_legal_mentions(instrument_id);
CREATE INDEX idx_email_legal_mentions_resolved ON public.email_legal_mentions(resolved);

-- 8. VERIFICATION CLAIMS (Propos à vérifier)
CREATE TABLE IF NOT EXISTS public.verification_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID REFERENCES public.emails(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id UUID,
  claim_text TEXT NOT NULL,
  claim_type TEXT DEFAULT 'legal_assertion',
  expected_citations JSONB DEFAULT '[]',
  unit_ids UUID[] DEFAULT '{}',
  source_basis TEXT DEFAULT 'db_only',
  risk_level TEXT DEFAULT 'low',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verification_claims_email ON public.verification_claims(email_id);
CREATE INDEX idx_verification_claims_incident ON public.verification_claims(incident_id);
CREATE INDEX idx_verification_claims_status ON public.verification_claims(status);

-- 9. VERIFICATION REPORTS (Résultats Perplexity)
CREATE TABLE IF NOT EXISTS public.verification_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.verification_claims(id) ON DELETE CASCADE,
  user_id UUID,
  verdict TEXT NOT NULL,
  confidence NUMERIC,
  evidence_urls TEXT[] DEFAULT '{}',
  diff_summary TEXT,
  severity TEXT DEFAULT 'info',
  perplexity_response JSONB,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verification_reports_claim ON public.verification_reports(claim_id);
CREATE INDEX idx_verification_reports_verdict ON public.verification_reports(verdict);

-- 10. SOURCE CATALOG (Sources à ingérer)
CREATE TABLE IF NOT EXISTS public.source_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'html',
  authority TEXT NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT 'CH',
  domain_tags TEXT[] DEFAULT '{}',
  fetch_frequency TEXT DEFAULT 'weekly',
  last_fetched_at TIMESTAMPTZ,
  next_fetch_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 50,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_source_catalog_jurisdiction ON public.source_catalog(jurisdiction);
CREATE INDEX idx_source_catalog_active ON public.source_catalog(is_active);

-- ENABLE RLS
ALTER TABLE public.legal_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_legal_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_catalog ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES - Legal data is public (read), admin managed (write)
CREATE POLICY "Legal instruments readable by all authenticated" ON public.legal_instruments
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Legal instruments writable by service" ON public.legal_instruments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Legal versions readable by all authenticated" ON public.legal_versions
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Legal versions writable by service" ON public.legal_versions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Legal units readable by all authenticated" ON public.legal_units
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Legal units writable by service" ON public.legal_units
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Legal sources readable by all authenticated" ON public.legal_sources
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Legal sources writable by service" ON public.legal_sources
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Legal relations readable by all authenticated" ON public.legal_relations
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Legal relations writable by service" ON public.legal_relations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Source catalog readable by all authenticated" ON public.source_catalog
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Source catalog writable by service" ON public.source_catalog
  FOR ALL USING (true) WITH CHECK (true);

-- Ingestion tables - service only
CREATE POLICY "Ingestion runs service access" ON public.ingestion_runs
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Ingestion items service access" ON public.ingestion_items
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Ingestion errors service access" ON public.ingestion_errors
  FOR ALL USING (true) WITH CHECK (true);

-- User-specific tables
CREATE POLICY "Users can view own email mentions" ON public.email_legal_mentions
  FOR SELECT USING (user_id = auth.uid() OR user_owns_email(email_id));
CREATE POLICY "Users can insert own email mentions" ON public.email_legal_mentions
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_owns_email(email_id));
CREATE POLICY "Service can manage email mentions" ON public.email_legal_mentions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own claims" ON public.verification_claims
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own claims" ON public.verification_claims
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Service can manage claims" ON public.verification_claims
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own reports" ON public.verification_reports
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service can manage reports" ON public.verification_reports
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_legal_instruments_updated_at
  BEFORE UPDATE ON public.legal_instruments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_units_updated_at
  BEFORE UPDATE ON public.legal_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_source_catalog_updated_at
  BEFORE UPDATE ON public.source_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();