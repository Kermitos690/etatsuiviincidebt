// Legal validation utilities - Enhanced anti-hallucination guardrails
// UPDATED: Now uses legal_instruments/legal_units (LKB schema)
import { log } from "./core.ts";

// ============= Types =============
export interface LegalReference {
  code: string; // 'CC', 'LPD', 'LEO', 'LASV'
  article: string; // '8', '13.1', '388'
  text?: string;
  verified?: boolean;
  source?: 'local' | 'perplexity' | 'unverified';
  unit_id?: string; // Link to legal_units
  instrument_id?: string; // Link to legal_instruments
}

export interface ValidationResult {
  isValid: boolean;
  verifiedRefs: LegalReference[];
  rejectedRefs: LegalReference[];
  hallucinationDetected: boolean;
  hallucinationDetails?: string[];
  correctedOutput?: unknown;
  confidenceAdjustment: number; // -1 to 0 (penalty)
  verificationStats: {
    total: number;
    verified: number;
    rejected: number;
    percentVerified: number;
  };
}

export interface LegalArticle {
  id: string;
  code_name: string;
  article_number: string;
  article_title?: string;
  article_text: string;
  domain?: string;
  keywords: string[];
  canton?: string;
  scope?: string;
}

// NEW: LKB-compatible types
export interface LegalUnit {
  id: string;
  instrument_id: string;
  cite_key: string;
  unit_type: string;
  content_text: string;
  keywords?: string[];
  hash_sha256?: string;
}

export interface LegalInstrument {
  id: string;
  uid: string;
  title: string;
  short_title?: string;
  jurisdiction: string;
  current_status: string;
  domain_tags?: string[];
}

// ============= Constants =============

// Swiss legal code patterns
const LEGAL_REF_PATTERNS = [
  // Swiss patterns with article number
  /(?:art\.?|article)\s*(\d+(?:\.\d+)?(?:\s*(?:al\.?|alinéa|let\.?)\s*[a-z0-9]+)?)\s+(?:du\s+)?([A-Z]{2,}(?:-[A-Z]+)?)/gi,
  /([A-Z]{2,}(?:-[A-Z]+)?)\s+(?:art\.?|article)\s*(\d+(?:\.\d+)?)/gi,
  // Direct code references
  /(LPD|CC|CO|CP|CPC|CPP|LPPA-VD|RLPA-VD|LOJV|CDPJ|CSIAS|LVPAE|LPA-VD|LSP-VD|LASV|LEO|Cst\.?)\s+(?:art\.?\s*)?(\d+(?:\.\d+)?(?:\s*(?:al\.?)\s*\d+)?)/gi,
  // ATF references (jurisprudence)
  /(ATF)\s+(\d+)\s+[IVX]+\s+(\d+)/gi,
];

// COMPLETE list of valid Swiss legal codes (Federal + Vaud + key cantons)
const VALID_LEGAL_CODES = new Set([
  // === FEDERAL CODES ===
  'CC', 'CO', 'CP', 'CPC', 'CPP', 'LPD', 'LPGA', 'LAI', 'LAMal', 'Cst',
  'LTF', 'LPA', 'LPers', 'LTrans', 'OFSo', 'PA', 'LAVS', 'LPC', 'LAA',
  'LPP', 'LAC', 'LACI', 'LEtr', 'LAsi', 'LN', 'LCR', 'LRN', 'LFH',
  
  // === VAUD - CONSTITUTION ===
  'Cst-VD',
  
  // === VAUD - INSTITUTIONS ===
  'LDCV', 'LEDP', 'LInfo', 'LLV', 'LJC', 'LC', 'LFusCom', 'LPIV',
  'LPers-VD', 'LREEDP',
  
  // === VAUD - FINANCES ===
  'LFin', 'LI', 'LICom', 'LEFI', 'LMut', 'LMP-VD', 'LCC',
  
  // === VAUD - ÉDUCATION ===
  'LEO', 'RLEO', 'LPS', 'RLPS', 'LEPr', 'LHEP', 'LUL', 'LGym', 'LVLFPr',
  
  // === VAUD - SOCIAL ===
  'LASV', 'RLASV', 'LPCFam', 'LAJE', 'LProMin', 'LVLAVI',
  
  // === VAUD - SANTÉ ===
  'LSP', 'LPFES', 'LSR', 'LAASD', 'LEMS',
  
  // === VAUD - JUSTICE ===
  'LJPA', 'LPA-VD', 'LPJA-VD', 'RLPA-VD', 'LEP', 'LPol', 'LiCPP', 'LVCR', 'LOJV',
  
  // === VAUD - CULTURE ===
  'LCH', 'LPrD', 'LArch',
  
  // === VAUD - TERRITOIRE ===
  'LATC', 'RLATC', 'LVLEne', 'LFaune', 'LPeche', 'LGD', 'LPrPNP',
  
  // === VAUD - TRANSPORTS ===
  'LRou', 'LMTP',
  
  // === VAUD - ÉCONOMIE ===
  'LEAE', 'LAgr', 'LTour',
  
  // === VAUD - PROTECTION ADULTE ===
  'LVPAE',
  
  // === OTHER CANTONS (common) ===
  'LPA-GE', 'LOJ-GE', 'LPA-NE', 'LPA-FR',
  
  // === SPECIAL ===
  'CSIAS', 'CDPJ', 'ATF', 'TF',
]);

// Mapping from code to instrument UID pattern (for LKB lookup)
export const CODE_TO_UID_PREFIX: Record<string, string> = {
  'CC': 'CH-CC',
  'CO': 'CH-CO',
  'CP': 'CH-CP',
  'CPC': 'CH-CPC',
  'CPP': 'CH-CPP',
  'LPD': 'CH-LPD',
  'LPGA': 'CH-LPGA',
  'Cst': 'CH-CST',
  'PA': 'CH-PA',
  'LAI': 'CH-LAI',
  'LAVS': 'CH-LAVS',
  'LTF': 'CH-LTF',
  'LEO': 'VD-LEO',
  'LASV': 'VD-LASV',
  'LPA-VD': 'VD-LPA',
  'LVPAE': 'VD-LVPAE',
  'LSP': 'VD-LSP',
  'LATC': 'VD-LATC',
  'LInfo': 'VD-LINFO',
  'Cst-VD': 'VD-CST',
};

// Phrases that indicate potential hallucination
const HALLUCINATION_INDICATORS = [
  "selon la jurisprudence constante",
  "il est de jurisprudence",
  "comme l'a rappelé le tribunal fédéral",
  "ATF non spécifié",
  "pratique établie",
  "selon la doctrine majoritaire",
  "l'article prévoit généralement",
  "conformément à l'usage",
];

// Suspicious patterns in legal references
const SUSPICIOUS_PATTERNS = [
  // Fake article numbers (too high for most codes)
  /art\.?\s*(\d{4,})/gi, // 4+ digit article numbers are usually fake
  // Vague references without specific article
  /selon\s+(?:le|la)\s+(?:loi|code|droit)\s+suisse/gi,
  // Generic without citation
  /en\s+vertu\s+du\s+droit\s+applicable/gi,
];

// ============= Core Functions =============

/**
 * Extract legal references from text with enhanced parsing
 */
export function extractLegalReferences(text: string): LegalReference[] {
  const refs: LegalReference[] = [];
  const seen = new Set<string>();
  
  for (const pattern of LEGAL_REF_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      let code: string;
      let article: string;
      
      // Handle different match groups based on pattern
      if (match[1] && match[2]) {
        // Check which is code vs article (codes are uppercase letters)
        if (/^[A-Z]{2,}/.test(match[1])) {
          code = match[1].toUpperCase().replace(/\.$/,'');
          article = match[2];
        } else {
          article = match[1];
          code = match[2].toUpperCase().replace(/\.$/,'');
        }
      } else if (match[1]) {
        code = match[1].toUpperCase().replace(/\.$/,'');
        article = match[2] || '';
      } else {
        continue;
      }
      
      // Normalize code name
      code = normalizeCodeName(code);
      
      const key = `${code}:${article}`;
      if (!seen.has(key) && article) {
        seen.add(key);
        refs.push({ 
          code, 
          article,
          verified: false,
          source: 'unverified'
        });
      }
    }
  }
  
  return refs;
}

/**
 * Normalize code names to standard format
 */
function normalizeCodeName(code: string): string {
  const normalizations: Record<string, string> = {
    'CST': 'Cst',
    'CST.': 'Cst',
    'CONST': 'Cst',
    'CONSTITUTION': 'Cst',
    'CODECIVIL': 'CC',
    'CIVIL': 'CC',
    'PENAL': 'CP',
    'OBLIGATIONS': 'CO',
    'CSTVD': 'Cst-VD',
    'LPAVD': 'LPA-VD',
    'LSPVD': 'LSP-VD',
  };
  
  const upper = code.toUpperCase().replace(/[.\s]/g, '');
  return normalizations[upper] || code;
}

/**
 * Validate legal references against the LKB (legal_units)
 */
export async function validateLegalReferencesLKB(
  refs: LegalReference[],
  supabase: any
): Promise<{ verified: LegalReference[]; rejected: LegalReference[] }> {
  const verified: LegalReference[] = [];
  const rejected: LegalReference[] = [];
  
  for (const ref of refs) {
    // First check if the code itself is valid
    if (!VALID_LEGAL_CODES.has(ref.code) && !VALID_LEGAL_CODES.has(ref.code.replace(/-[A-Z]+$/, ''))) {
      rejected.push({
        ...ref,
        source: 'unverified'
      });
      continue;
    }
    
    // Try to find in legal_units using cite_key pattern
    const citeKeyPattern = `art. ${ref.article}`;
    const uidPrefix = CODE_TO_UID_PREFIX[ref.code];
    
    let found = null;
    
    if (uidPrefix) {
      // Search via instrument -> units
      const { data: units } = await supabase
        .from('legal_units')
        .select(`
          id, cite_key, content_text, keywords,
          legal_instruments!inner(uid, short_title)
        `)
        .eq('legal_instruments.uid', uidPrefix)
        .ilike('cite_key', `%${ref.article}%`)
        .limit(1)
        .maybeSingle();
      
      if (units) {
        found = units;
      }
    }
    
    // Fallback: search by content if cite_key not matched
    if (!found) {
      const { data: fallbackUnits } = await supabase
        .from('legal_units')
        .select('id, cite_key, content_text, keywords')
        .ilike('cite_key', `%${ref.article}%`)
        .limit(1)
        .maybeSingle();
      
      if (fallbackUnits) {
        found = fallbackUnits;
      }
    }
    
    if (found) {
      verified.push({
        ...ref,
        text: found.content_text,
        verified: true,
        source: 'local',
        unit_id: found.id
      });
    } else {
      // Code is valid but article not found in local DB
      rejected.push({
        ...ref,
        source: 'unverified'
      });
    }
  }
  
  return { verified, rejected };
}

/**
 * Legacy: Validate legal references against the old repository format
 */
export async function validateLegalReferences(
  refs: LegalReference[],
  repository: LegalArticle[]
): Promise<{ verified: LegalReference[]; rejected: LegalReference[] }> {
  const verified: LegalReference[] = [];
  const rejected: LegalReference[] = [];
  
  for (const ref of refs) {
    // First check if the code itself is valid
    if (!VALID_LEGAL_CODES.has(ref.code) && !VALID_LEGAL_CODES.has(ref.code.replace(/-[A-Z]+$/, ''))) {
      rejected.push({
        ...ref,
        source: 'unverified'
      });
      continue;
    }
    
    // Then check against repository
    const found = repository.find(
      article => 
        article.code_name.toUpperCase() === ref.code.toUpperCase() &&
        normalizeArticleNumber(article.article_number) === normalizeArticleNumber(ref.article)
    );
    
    if (found) {
      verified.push({
        ...ref,
        text: found.article_text,
        verified: true,
        source: 'local'
      });
    } else {
      rejected.push({
        ...ref,
        source: 'unverified'
      });
    }
  }
  
  return { verified, rejected };
}

/**
 * Normalize article numbers for comparison
 */
function normalizeArticleNumber(article: string): string {
  return article
    .replace(/\s+/g, '')
    .replace(/art\.?/gi, '')
    .replace(/al\.?/gi, '.')
    .replace(/alinéa/gi, '.')
    .replace(/let\.?/gi, '')
    .toLowerCase()
    .trim();
}

/**
 * Detect potential hallucinations in AI output
 */
export function detectHallucinations(text: string): string[] {
  const detected: string[] = [];
  const lowerText = text.toLowerCase();
  
  // Check for vague formulations
  for (const indicator of HALLUCINATION_INDICATORS) {
    if (lowerText.includes(indicator.toLowerCase())) {
      detected.push(`Formulation vague detectee: "${indicator}"`);
    }
  }
  
  // Check for fake ATF references
  const atfPattern = /ATF\s+(\d+)\s+[IVX]+\s+(\d+)/g;
  const atfMatches = text.matchAll(atfPattern);
  for (const match of atfMatches) {
    const volume = parseInt(match[1]);
    // ATF volume numbers should be reasonable (100-160 typically)
    if (volume < 100 || volume > 200) {
      detected.push(`Reference ATF suspecte: ${match[0]} (volume ${volume} hors plage normale)`);
    }
  }
  
  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    const matches = text.match(regex);
    if (matches) {
      for (const m of matches) {
        detected.push(`Pattern suspect: "${m.substring(0, 50)}..."`);
      }
    }
  }
  
  // Check for invented article numbers (e.g., Art. 9999 CC)
  const articlePattern = /art\.?\s*(\d+)/gi;
  let artMatch;
  while ((artMatch = articlePattern.exec(text)) !== null) {
    const artNum = parseInt(artMatch[1]);
    if (artNum > 1000) {
      detected.push(`Numero d'article suspect: ${artNum} (trop eleve pour la plupart des codes)`);
    }
  }
  
  return detected;
}

/**
 * Full validation of AI output with legal references (LKB version)
 */
export async function validateAIOutputLKB(
  aiOutput: string,
  supabase: any,
  options: {
    requireLegalBasis?: boolean;
    strictMode?: boolean;
  } = {}
): Promise<ValidationResult> {
  const { requireLegalBasis = true, strictMode = false } = options;
  
  // Extract claimed references
  const claimedRefs = extractLegalReferences(aiOutput);
  log("info", "Extracted legal references from AI output", { count: claimedRefs.length });
  
  // Validate against LKB
  const { verified, rejected } = await validateLegalReferencesLKB(claimedRefs, supabase);
  
  // Detect hallucinations
  const hallucinationDetails = detectHallucinations(aiOutput);
  const hallucinationDetected = hallucinationDetails.length > 0 || 
    (strictMode && rejected.length > claimedRefs.length * 0.3);
  
  // Calculate verification stats
  const total = claimedRefs.length;
  const verifiedCount = verified.length;
  const rejectedCount = rejected.length;
  const percentVerified = total > 0 ? Math.round((verifiedCount / total) * 100) : 100;
  
  // Calculate confidence adjustment
  let confidenceAdjustment = 0;
  if (rejected.length > 0) {
    confidenceAdjustment -= (rejected.length / Math.max(claimedRefs.length, 1)) * 0.5;
  }
  if (hallucinationDetails.length > 0) {
    confidenceAdjustment -= 0.15 * hallucinationDetails.length;
  }
  confidenceAdjustment = Math.max(confidenceAdjustment, -1);
  
  // Determine validity
  const isValid = !hallucinationDetected && 
    (!requireLegalBasis || verified.length > 0 || claimedRefs.length === 0);
  
  return {
    isValid,
    verifiedRefs: verified,
    rejectedRefs: rejected,
    hallucinationDetected,
    hallucinationDetails: hallucinationDetails.length > 0 ? hallucinationDetails : undefined,
    confidenceAdjustment,
    verificationStats: {
      total,
      verified: verifiedCount,
      rejected: rejectedCount,
      percentVerified,
    },
  };
}

/**
 * Legacy: Full validation of AI output with legal references
 */
export async function validateAIOutput(
  aiOutput: string,
  repository: LegalArticle[],
  options: {
    requireLegalBasis?: boolean;
    strictMode?: boolean;
  } = {}
): Promise<ValidationResult> {
  const { requireLegalBasis = true, strictMode = false } = options;
  
  // Extract claimed references
  const claimedRefs = extractLegalReferences(aiOutput);
  log("info", "Extracted legal references from AI output", { count: claimedRefs.length });
  
  // Validate against repository
  const { verified, rejected } = await validateLegalReferences(claimedRefs, repository);
  
  // Detect hallucinations
  const hallucinationDetails = detectHallucinations(aiOutput);
  const hallucinationDetected = hallucinationDetails.length > 0 || 
    (strictMode && rejected.length > claimedRefs.length * 0.3);
  
  // Calculate verification stats
  const total = claimedRefs.length;
  const verifiedCount = verified.length;
  const rejectedCount = rejected.length;
  const percentVerified = total > 0 ? Math.round((verifiedCount / total) * 100) : 100;
  
  // Calculate confidence adjustment
  let confidenceAdjustment = 0;
  if (rejected.length > 0) {
    confidenceAdjustment -= (rejected.length / Math.max(claimedRefs.length, 1)) * 0.5;
  }
  if (hallucinationDetails.length > 0) {
    confidenceAdjustment -= 0.15 * hallucinationDetails.length;
  }
  confidenceAdjustment = Math.max(confidenceAdjustment, -1);
  
  // Determine validity
  const isValid = !hallucinationDetected && 
    (!requireLegalBasis || verified.length > 0 || claimedRefs.length === 0);
  
  return {
    isValid,
    verifiedRefs: verified,
    rejectedRefs: rejected,
    hallucinationDetected,
    hallucinationDetails: hallucinationDetails.length > 0 ? hallucinationDetails : undefined,
    confidenceAdjustment,
    verificationStats: {
      total,
      verified: verifiedCount,
      rejected: rejectedCount,
      percentVerified,
    },
  };
}

/**
 * Cross-verify legal references using multiple sources (LKB version)
 */
export async function crossVerifyReferencesLKB(
  refs: LegalReference[],
  supabase: any,
  perplexityVerifier?: (ref: LegalReference) => Promise<boolean>
): Promise<LegalReference[]> {
  const verifiedRefs: LegalReference[] = [];
  
  for (const ref of refs) {
    // Check LKB first
    const uidPrefix = CODE_TO_UID_PREFIX[ref.code];
    let localMatch = null;
    
    if (uidPrefix) {
      const { data } = await supabase
        .from('legal_units')
        .select(`id, cite_key, content_text, legal_instruments!inner(uid)`)
        .eq('legal_instruments.uid', uidPrefix)
        .ilike('cite_key', `%${ref.article}%`)
        .limit(1)
        .maybeSingle();
      
      localMatch = data;
    }
    
    if (localMatch) {
      verifiedRefs.push({
        ...ref,
        text: localMatch.content_text,
        verified: true,
        source: 'local',
        unit_id: localMatch.id
      });
    } else if (perplexityVerifier) {
      // Try external verification
      try {
        const isValid = await perplexityVerifier(ref);
        verifiedRefs.push({
          ...ref,
          verified: isValid,
          source: isValid ? 'perplexity' : 'unverified'
        });
      } catch {
        verifiedRefs.push({
          ...ref,
          verified: false,
          source: 'unverified'
        });
      }
    } else {
      verifiedRefs.push({
        ...ref,
        verified: false,
        source: 'unverified'
      });
    }
  }
  
  return verifiedRefs;
}

/**
 * Create the "base legale non determinee" fallback response
 */
export function createUndeterminedLegalBasisResponse(
  context: string,
  factSummary: string
): string {
  return `## Analyse des faits

${factSummary}

## Base legale

**Base legale non determinee**

L'analyse n'a pas permis d'identifier une base legale verifiable dans le referentiel interne. 
Une verification manuelle par un specialiste est recommandee.

## Contexte
${context}

## Recommandations
1. Consulter le referentiel legal interne pour identifier les articles applicables
2. Solliciter l'avis d'un specialiste si necessaire
3. Ne pas conclure a une illegalite sans base legale verifiee`;
}

/**
 * Generate verification badge text based on validation result
 */
export function getVerificationBadge(result: ValidationResult): {
  text: string;
  level: 'verified' | 'partial' | 'unverified';
  color: 'green' | 'yellow' | 'red';
} {
  if (result.verificationStats.percentVerified >= 80 && !result.hallucinationDetected) {
    return { text: 'Verifie', level: 'verified', color: 'green' };
  } else if (result.verificationStats.percentVerified >= 50) {
    return { text: 'Partiellement verifie', level: 'partial', color: 'yellow' };
  } else {
    return { text: 'Non verifie', level: 'unverified', color: 'red' };
  }
}

/**
 * Generate SHA-256 hash
 */
export async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create proof chain entry data
 */
export async function createProofChainData(
  entityType: string,
  entityId: string,
  content: unknown,
  metadata?: Record<string, unknown>
): Promise<{
  content_hash: string;
  metadata_hash: string | null;
  combined_hash: string;
}> {
  const contentStr = typeof content === "string" ? content : JSON.stringify(content);
  const contentHash = await generateHash(contentStr);
  
  let metadataHash: string | null = null;
  if (metadata) {
    metadataHash = await generateHash(JSON.stringify(metadata));
  }
  
  const combinedStr = `${entityType}:${entityId}:${contentHash}:${metadataHash || ""}`;
  const combinedHash = await generateHash(combinedStr);
  
  return {
    content_hash: contentHash,
    metadata_hash: metadataHash,
    combined_hash: combinedHash,
  };
}

/**
 * Check if a legal code is valid
 */
export function isValidLegalCode(code: string): boolean {
  return VALID_LEGAL_CODES.has(code) || VALID_LEGAL_CODES.has(code.replace(/-[A-Z]+$/, ''));
}

/**
 * Get all valid legal codes
 */
export function getAllValidLegalCodes(): string[] {
  return Array.from(VALID_LEGAL_CODES);
}
