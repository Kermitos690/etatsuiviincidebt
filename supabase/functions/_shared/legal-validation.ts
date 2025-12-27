// Legal validation utilities - guardrails anti-hallucination
import { log } from "./core.ts";

// ============= Types =============
export interface LegalReference {
  code: string; // 'CC', 'LPD', 'LPPA-VD', 'CSIAS'
  article: string; // '8', '13.1', '388'
  text?: string;
}

export interface ValidationResult {
  isValid: boolean;
  verifiedRefs: LegalReference[];
  rejectedRefs: LegalReference[];
  hallucinationDetected: boolean;
  hallucinationDetails?: string[];
  correctedOutput?: unknown;
  confidenceAdjustment: number; // -1 to 0 (penalty)
}

export interface LegalArticle {
  id: string;
  code_name: string;
  article_number: string;
  article_title?: string;
  article_text: string;
  domain?: string;
  keywords: string[];
}

// ============= Constants =============
const LEGAL_REF_PATTERNS = [
  // Swiss patterns
  /(?:art\.?|article)\s*(\d+(?:\.\d+)?(?:\s*(?:al\.?|alinéa)\s*\d+)?)\s+(?:du\s+)?([A-Z]{2,}(?:-[A-Z]+)?)/gi,
  /([A-Z]{2,}(?:-[A-Z]+)?)\s+(?:art\.?|article)\s*(\d+(?:\.\d+)?)/gi,
  // Direct code references
  /(LPD|CC|CO|CP|CPC|CPP|LPPA-VD|RLPA-VD|LOJV|CDPJ|CSIAS)\s+(\d+(?:\.\d+)?)/gi,
];

const HALLUCINATION_INDICATORS = [
  "selon la jurisprudence constante",
  "il est de jurisprudence",
  "comme l'a rappelé le tribunal fédéral",
  "ATF non spécifié",
  "pratique établie",
];

// ============= Core Functions =============

/**
 * Extract legal references from text
 */
export function extractLegalReferences(text: string): LegalReference[] {
  const refs: LegalReference[] = [];
  const seen = new Set<string>();
  
  for (const pattern of LEGAL_REF_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      let code: string, article: string;
      
      // Handle different match groups based on pattern
      if (match[1] && match[2]) {
        // Check which is code vs article (codes are uppercase letters)
        if (/^[A-Z]{2,}/.test(match[1])) {
          code = match[1].toUpperCase();
          article = match[2];
        } else {
          article = match[1];
          code = match[2].toUpperCase();
        }
      } else {
        continue;
      }
      
      const key = `${code}:${article}`;
      if (!seen.has(key)) {
        seen.add(key);
        refs.push({ code, article });
      }
    }
  }
  
  return refs;
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
    const found = repository.find(
      article => 
        article.code_name.toUpperCase() === ref.code.toUpperCase() &&
        normalizeArticleNumber(article.article_number) === normalizeArticleNumber(ref.article)
    );
    
    if (found) {
      verified.push({
        ...ref,
        text: found.article_text,
      });
    } else {
      rejected.push(ref);
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
    .toLowerCase();
}

/**
 * Detect potential hallucinations in AI output
 */
export function detectHallucinations(text: string): string[] {
  const detected: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const indicator of HALLUCINATION_INDICATORS) {
    if (lowerText.includes(indicator.toLowerCase())) {
      detected.push(`Formulation vague détectée: "${indicator}"`);
    }
  }
  
  // Check for fake ATF references
  const atfPattern = /ATF\s+(\d+)\s+[IVX]+\s+(\d+)/g;
  const atfMatches = text.matchAll(atfPattern);
  for (const match of atfMatches) {
    // ATF volume numbers should be reasonable (100-160 typically)
    const volume = parseInt(match[1]);
    if (volume < 100 || volume > 200) {
      detected.push(`Référence ATF suspecte: ${match[0]}`);
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
    (strictMode && rejected.length > 0);
  
  // Calculate confidence adjustment
  let confidenceAdjustment = 0;
  if (rejected.length > 0) {
    confidenceAdjustment -= (rejected.length / Math.max(claimedRefs.length, 1)) * 0.5;
  }
  if (hallucinationDetails.length > 0) {
    confidenceAdjustment -= 0.2 * hallucinationDetails.length;
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
  };
}

/**
 * Create the "base légale non déterminée" fallback response
 */
export function createUndeterminedLegalBasisResponse(
  context: string,
  factSummary: string
): string {
  return `## Analyse des faits

${factSummary}

## Base légale

**Base légale non déterminée**

L'analyse n'a pas permis d'identifier une base légale vérifiable dans le référentiel interne. 
Une vérification manuelle par un spécialiste est recommandée.

## Contexte
${context}

## Recommandations
1. Consulter le référentiel légal interne pour identifier les articles applicables
2. Solliciter l'avis d'un spécialiste si nécessaire
3. Ne pas conclure à une illégalité sans base légale vérifiée`;
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
