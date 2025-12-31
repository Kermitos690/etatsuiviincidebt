/**
 * Email Cleanup Utility Functions
 * Pure functions exported for testing and reuse
 */

// ============================================================
// CONSTANTS
// ============================================================

export const EMAIL_CLEANUP_BATCH_SIZE = 200;

export const GENERIC_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "icloud.com",
  "protonmail.com",
  "live.com",
  "msn.com",
  "aol.com",
  "me.com",
];

// ============================================================
// TYPES
// ============================================================

export interface EmailRow {
  id: string;
  subject: string;
  sender: string;
  received_at: string;
}

export interface GmailConfig {
  domains: string[];
  keywords: string[];
}

export interface RelevanceResult {
  relevant: boolean;
  matchedKeywords: string[];
}

export interface BatchDeleteResult {
  success: boolean;
  deletedCount: number;
  error?: string;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Extract domain from email address (handles "Name <email@domain.com>" format)
 */
export function extractDomain(email: string): string {
  // Handle "Name <email@domain.com>" format - extract just the domain
  const bracketMatch = email.match(/<[^@]+@([^>]+)>/);
  if (bracketMatch) return bracketMatch[1].toLowerCase().trim();

  // Handle plain "email@domain.com" format
  const plainMatch = email.match(/@(.+)$/);
  if (plainMatch) return plainMatch[1].toLowerCase().trim();

  return email.toLowerCase().trim();
}

/**
 * Extract email address from sender (handles "Name <email@domain.com>" format)
 */
export function extractEmail(sender: string): string {
  const match = sender.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase() : sender.toLowerCase();
}

/**
 * Check if an email is relevant based on Gmail config filters
 */
export function isEmailRelevant(
  email: EmailRow,
  gmailConfig: GmailConfig | null
): RelevanceResult {
  if (!gmailConfig) return { relevant: true, matchedKeywords: [] };

  const domains = gmailConfig.domains || [];
  const keywords = gmailConfig.keywords || [];
  const matchedKeywords: string[] = [];

  const senderDomain = extractDomain(email.sender);
  const domainMatch =
    domains.length === 0 ||
    domains.some((d) => senderDomain.includes(d.toLowerCase().trim()));

  const subjectLower = (email.subject || "").toLowerCase();
  const keywordMatch =
    keywords.length === 0 ||
    keywords.some((k) => {
      const matches = subjectLower.includes(k.toLowerCase().trim());
      if (matches) matchedKeywords.push(k);
      return matches;
    });

  return { relevant: domainMatch && keywordMatch, matchedKeywords };
}

/**
 * Delete emails in batches to avoid timeouts
 */
export async function batchDelete(
  ids: string[],
  deleteFunc: (batch: string[]) => Promise<{ error: Error | null }>
): Promise<BatchDeleteResult> {
  let deletedCount = 0;

  for (let i = 0; i < ids.length; i += EMAIL_CLEANUP_BATCH_SIZE) {
    const batch = ids.slice(i, i + EMAIL_CLEANUP_BATCH_SIZE);
    const { error } = await deleteFunc(batch);

    if (error) {
      return { success: false, error: error.message, deletedCount };
    }

    deletedCount += batch.length;
  }

  return { success: true, deletedCount };
}

/**
 * Check if domain is a generic email provider
 */
export function isGenericDomain(domain: string): boolean {
  return GENERIC_DOMAINS.includes(domain.toLowerCase());
}
