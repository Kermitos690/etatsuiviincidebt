/**
 * LKB Pipeline Service
 * 
 * Orchestrates the DB-first legal verification pipeline:
 * 1. email-legal-detection: Detect legal mentions in emails
 * 2. claim-builder: Build verification claims backed by DB
 * 3. perplexity-verifier: Audit claims against official sources
 */

import { supabase } from "@/integrations/supabase/client";

export interface LegalMention {
  match_type: 'exact_citation' | 'alias' | 'keyword' | 'domain_inference';
  match_text: string;
  confidence: number;
  resolved: boolean;
  instrument_uid?: string;
}

export interface DetectionResult {
  success: boolean;
  email_id: string;
  summary: {
    total_mentions: number;
    exact_citations: number;
    resolved: number;
    unresolved: number;
    detected_domains: string[];
  };
  mentions: LegalMention[];
  warnings: string[];
}

export interface ClaimResult {
  success: boolean;
  claims_built: number;
  claims_blocked: number;
  claim_ids: string[];
  summary: {
    legal_assertions: number;
    deadline_claims: number;
    procedure_claims: number;
    right_claims: number;
  };
}

export interface VerificationResult {
  success: boolean;
  verified: number;
  summary: {
    true: number;
    false: number;
    uncertain: number;
  };
  results: Array<{
    claim_id: string;
    verdict: 'true' | 'false' | 'uncertain';
    confidence: number;
    evidence_urls: string[];
    diff_summary?: string;
    severity: 'info' | 'warning' | 'error';
  }>;
}

/**
 * Step 1: Detect legal mentions in an email
 */
export async function detectLegalMentions(
  emailId: string,
  subject: string,
  body: string,
  from: string,
  date: string
): Promise<DetectionResult> {
  const { data, error } = await supabase.functions.invoke('email-legal-detection', {
    body: { email_id: emailId, subject, body, from, date }
  });

  if (error) {
    console.error('Legal detection error:', error);
    return {
      success: false,
      email_id: emailId,
      summary: { total_mentions: 0, exact_citations: 0, resolved: 0, unresolved: 0, detected_domains: [] },
      mentions: [],
      warnings: [error.message]
    };
  }

  return data as DetectionResult;
}

/**
 * Step 2: Build verification claims from analysis
 */
export async function buildVerificationClaims(
  emailId?: string,
  incidentId?: string,
  analysisResult?: {
    legal_references?: Array<{ article: string; law: string; context: string }>;
    deadlines?: Array<{ days: number; description: string }>;
  }
): Promise<ClaimResult> {
  const { data, error } = await supabase.functions.invoke('claim-builder', {
    body: { email_id: emailId, incident_id: incidentId, analysis_result: analysisResult }
  });

  if (error) {
    console.error('Claim builder error:', error);
    return {
      success: false,
      claims_built: 0,
      claims_blocked: 0,
      claim_ids: [],
      summary: { legal_assertions: 0, deadline_claims: 0, procedure_claims: 0, right_claims: 0 }
    };
  }

  return data as ClaimResult;
}

/**
 * Step 3: Verify claims with Perplexity audit
 */
export async function verifyClaimsWithPerplexity(
  claimIds?: string[],
  emailId?: string,
  incidentId?: string
): Promise<VerificationResult> {
  const { data, error } = await supabase.functions.invoke('perplexity-verifier', {
    body: { claim_ids: claimIds, email_id: emailId, incident_id: incidentId }
  });

  if (error) {
    console.error('Verification error:', error);
    return {
      success: false,
      verified: 0,
      summary: { true: 0, false: 0, uncertain: 0 },
      results: []
    };
  }

  return data as VerificationResult;
}

/**
 * Run full pipeline for an email
 */
export async function runFullLegalPipeline(
  emailId: string,
  email: { subject: string; body: string; sender: string; date: string }
): Promise<{
  detection: DetectionResult;
  claims: ClaimResult;
  verification: VerificationResult | null;
}> {
  // Step 1: Detect mentions
  const detection = await detectLegalMentions(
    emailId,
    email.subject,
    email.body,
    email.sender,
    email.date
  );

  // Step 2: Build claims if we have mentions
  const claims = await buildVerificationClaims(emailId);

  // Step 3: Verify claims if any were built
  let verification: VerificationResult | null = null;
  if (claims.claims_built > 0 && claims.claim_ids.length > 0) {
    verification = await verifyClaimsWithPerplexity(claims.claim_ids);
  }

  return { detection, claims, verification };
}

/**
 * Query LKB instruments by domain
 */
export async function queryInstrumentsByDomain(domain: string): Promise<Array<{
  instrument_uid: string;
  title: string;
  abbreviation: string;
  current_status: string;
}>> {
  const { data, error } = await supabase
    .from('legal_instruments')
    .select('instrument_uid, title, abbreviation, current_status')
    .contains('domain_tags', [domain])
    .eq('current_status', 'in_force')
    .order('title');

  if (error) {
    console.error('Query error:', error);
    return [];
  }

  return data || [];
}

/**
 * Query LKB units by instrument
 */
export async function queryUnitsByInstrument(instrumentId: string): Promise<Array<{
  id: string;
  cite_key: string;
  content_text: string;
  is_key_unit: boolean;
}>> {
  const { data, error } = await supabase
    .from('legal_units')
    .select('id, cite_key, content_text, is_key_unit')
    .eq('instrument_id', instrumentId)
    .order('ordinal');

  if (error) {
    console.error('Query error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get LKB statistics
 */
export async function getLKBStatistics(): Promise<{
  domains: number;
  instruments: number;
  units: number;
  keyUnits: number;
}> {
  const [domainsRes, instrumentsRes, unitsRes, keyUnitsRes] = await Promise.all([
    supabase.from('legal_domains').select('*', { count: 'exact', head: true }),
    supabase.from('legal_instruments').select('*', { count: 'exact', head: true }),
    supabase.from('legal_units').select('*', { count: 'exact', head: true }),
    supabase.from('legal_units').select('*', { count: 'exact', head: true }).eq('is_key_unit', true),
  ]);

  return {
    domains: domainsRes.count || 0,
    instruments: instrumentsRes.count || 0,
    units: unitsRes.count || 0,
    keyUnits: keyUnitsRes.count || 0,
  };
}

/**
 * Trigger LKB seed
 */
export async function triggerLKBSeed(): Promise<{
  success: boolean;
  stats?: {
    domains: number;
    instruments: number;
    versions: number;
    sources: number;
    units: number;
  };
  error?: string;
}> {
  const { data, error } = await supabase.functions.invoke('seed-complete-laws');

  if (error) {
    return { success: false, error: error.message };
  }

  return data;
}
