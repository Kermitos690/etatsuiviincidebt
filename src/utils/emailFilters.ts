export type GmailFilters = {
  domains: string[];
  keywords: string[];
};

const normalize = (v: string) => v.trim().toLowerCase();

export function normalizeDomain(input: string): string {
  const d = normalize(input);
  // allow user to paste full email; keep only domain part
  const at = d.lastIndexOf("@");
  const domain = at >= 0 ? d.slice(at + 1) : d;
  return domain.replace(/^\.+|\.+$/g, "");
}

function emailHasDomain(email: { sender?: string | null; recipient?: string | null }, domain: string) {
  const d = normalizeDomain(domain);
  if (!d) return false;
  const s = normalize(email.sender || "");
  const r = normalize(email.recipient || "");
  return s.includes(`@${d}`) || s.endsWith(d) || r.includes(`@${d}`) || r.endsWith(d);
}

function emailHasKeyword(email: { subject?: string | null; body?: string | null }, keyword: string) {
  const k = normalize(keyword);
  if (!k) return false;
  const subject = normalize(email.subject || "");
  const body = normalize(email.body || "");
  return subject.includes(k) || body.includes(k);
}

export function isEmailRelevant(
  email: { sender?: string | null; recipient?: string | null; subject?: string | null; body?: string | null },
  filters: GmailFilters,
) {
  const domains = (filters.domains || []).map(normalizeDomain).filter(Boolean);
  const keywords = (filters.keywords || []).map(normalize).filter(Boolean);

  const hasDomains = domains.length > 0;
  const hasKeywords = keywords.length > 0;

  // No filters => treat everything as relevant (UI can warn)
  if (!hasDomains && !hasKeywords) return true;

  const domainMatch = hasDomains ? domains.some((d) => emailHasDomain(email, d)) : true;
  const keywordMatch = hasKeywords ? keywords.some((k) => emailHasKeyword(email, k)) : true;

  // If both are configured, require BOTH to reduce noise.
  return domainMatch && keywordMatch;
}
