// Legal validation utilities - Enhanced anti-hallucination guardrails
import { log } from "./core.ts";

// ============= Types =============
export interface LegalReference {
  code: string; // 'CC', 'LPD', 'LPPA-VD', 'CSIAS'
  article: string; // '8', '13.1', '388'
  text?: string;
  verified?: boolean;
  source?: 'local' | 'perplexity' | 'unverified';
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

// ============= Constants =============

// Swiss legal code patterns
const LEGAL_REF_PATTERNS = [
  // Swiss patterns with article number
  /(?:art\.?|article)\s*(\d+(?:\.\d+)?(?:\s*(?:al\.?|alinéa|let\.?)\s*[a-z0-9]+)?)\s+(?:du\s+)?([A-Z]{2,}(?:-[A-Z]+)?)/gi,
  /([A-Z]{2,}(?:-[A-Z]+)?)\s+(?:art\.?|article)\s*(\d+(?:\.\d+)?)/gi,
  // Direct code references
  /(LPD|CC|CO|CP|CPC|CPP|LPPA-VD|RLPA-VD|LOJV|CDPJ|CSIAS|LVPAE|LPA-VD|LSP-VD|LASV|Cst\.?)\s+(?:art\.?\s*)?(\d+(?:\.\d+)?(?:\s*(?:al\.?)\s*\d+)?)/gi,
  // ATF references (jurisprudence)
  /(ATF)\s+(\d+)\s+[IVX]+\s+(\d+)/gi,
];

// Known valid Swiss legal codes
const VALID_LEGAL_CODES = new Set([
  // Federal codes
  'CC', 'CO', 'CP', 'CPC', 'CPP', 'LPD', 'LPGA', 'LAI', 'LAMal', 'Cst',
  'LTF', 'LPA', 'LPers', 'LTrans', 'OFSo',
  // Vaud cantonal
  'LVPAE', 'LPA-VD', 'LSP-VD', 'LASV', 'LEO', 'LPJA-VD', 'RLPA-VD', 'LOJV',
  // Geneva cantonal
  'LPA-GE', 'LOJ-GE',
  // Common abbreviations
  'CSIAS', 'CDPJ', 'ATF', 'TF',
]);

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
  };
  
  const upper = code.toUpperCase().replace(/[.\s]/g, '');
  return normalizations[upper] || code;
}

/**
 * Validate legal references against the repository
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
      // Code is valid but article not found in local DB
      // Mark as potentially valid (needs Perplexity verification)
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
 * Full validation of AI output with legal references
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
 * Cross-verify legal references using multiple sources
 */
export async function crossVerifyReferences(
  refs: LegalReference[],
  localRepository: LegalArticle[],
  perplexityVerifier?: (ref: LegalReference) => Promise<boolean>
): Promise<LegalReference[]> {
  const verifiedRefs: LegalReference[] = [];
  
  for (const ref of refs) {
    // Check local first
    const localMatch = localRepository.find(
      article => 
        article.code_name.toUpperCase() === ref.code.toUpperCase() &&
        normalizeArticleNumber(article.article_number) === normalizeArticleNumber(ref.article)
    );
    
    if (localMatch) {
      verifiedRefs.push({
        ...ref,
        text: localMatch.article_text,
        verified: true,
        source: 'local'
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
