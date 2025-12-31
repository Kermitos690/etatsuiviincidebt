import { supabase } from "@/integrations/supabase/client";

// ============================================================
// TYPES
// ============================================================

export type LegalVerifyMode =
  | "legal"
  | "procedure"
  | "roles"
  | "deadlines"
  | "definitions"
  | "jurisprudence";

export interface LegalCitation {
  title: string;
  url: string;
}

export interface LegalVerifyRequest {
  query: string;
  context?: {
    incident_title?: string;
    category?: string;
    event_date?: string;
    facts_summary?: string;
    jurisdiction?: string;
    institutions?: string[];
    topics?: string[];
  };
  mode?: LegalVerifyMode;
  max_citations?: number;
  force_external?: boolean;
}

export interface LegalVerifyResponse {
  summary: string;
  key_points: string[];
  citations: LegalCitation[];
  confidence: number; // 0..1
  warnings?: string[];
  source: "local" | "external" | "hybrid" | "degraded";
  cost_saved: boolean;
}

// ============================================================
// CONSTANTS
// ============================================================

export const DEGRADED_RESPONSE: LegalVerifyResponse = {
  summary: "Cadre légal non vérifié – service indisponible",
  key_points: [],
  citations: [],
  confidence: 0,
  warnings: ["perplexity_unavailable"],
  source: "degraded",
  cost_saved: false,
};

export const LEGAL_KEYWORDS = [
  "lpd",
  "loi protection données",
  "données personnelles",
  "droit d'accès",
  "accès dossier",
  "traçabilité",
  "curateur",
  "curatelle",
  "protection adulte",
  "code civil",
  "cc",
  "délai",
  "recours",
  "opposition",
  "contestation",
  "juge de paix",
  "jdp",
  "apea",
  "autorité de protection",
  "sctp",
];

export const EXTERNAL_REQUIRED_KEYWORDS = [
  "jurisprudence",
  "atf",
  "arrêt",
  "tribunal fédéral",
  "décision",
  "jugement",
  "recours accepté",
  "recours rejeté",
  "délai exact",
  "combien de jours",
  "quel délai",
];

export const INSTITUTION_PATTERNS: Record<string, RegExp> = {
  JDP: /\b(juge de paix|jdp|justice de paix)\b/i,
  SCTP: /\b(sctp|service des curatelles|tutelles)\b/i,
  CSR: /\b(csr|centre social régional)\b/i,
  AI: /\b(assurance invalidité|office ai|\bai\b)\b/i,
  APEA: /\b(apea|autorité.*protection.*(enfant|adulte))\b/i,
};

export const TOPIC_PATTERNS: Record<string, RegExp> = {
  LPD: /\b(lpd|données personnelles|protection des données|droit d'accès)\b/i,
  CC: /\b(code civil|cc|curateur|curatelle|protection de l'adulte|art\.?\s*388|art\.?\s*389|art\.?\s*390)\b/i,
  LPGA: /\b(lpga|assurances sociales|partie générale)\b/i,
  LAI: /\b(lai|assurance invalidité|invalidité)\b/i,
};

// ============================================================
// SECURITY / XSS (HARD)
// ============================================================

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

function safeHref(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
    return "#";
  } catch {
    return "#";
  }
}

function clamp01(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function isLegalVerifyResponse(data: any): data is LegalVerifyResponse {
  return (
    data &&
    typeof data === "object" &&
    typeof data.summary === "string" &&
    Array.isArray(data.key_points) &&
    Array.isArray(data.citations) &&
    typeof data.confidence === "number" &&
    typeof data.source === "string" &&
    typeof data.cost_saved === "boolean"
  );
}

function normalizeResponse(data: any): LegalVerifyResponse {
  if (!isLegalVerifyResponse(data)) return { ...DEGRADED_RESPONSE };

  const citations: LegalCitation[] = Array.isArray(data.citations)
    ? data.citations
        .map((c: any) => ({ title: String(c?.title || ""), url: String(c?.url || "") }))
        .filter((c: any) => c.url)
    : [];

  const keyPoints = Array.isArray(data.key_points)
    ? data.key_points.map((p: any) => String(p)).filter(Boolean)
    : [];

  const warnings = Array.isArray(data.warnings) ? data.warnings.map((w: any) => String(w)) : undefined;

  const source =
    data.source === "local" || data.source === "external" || data.source === "hybrid" || data.source === "degraded"
      ? (data.source as LegalVerifyResponse["source"])
      : "degraded";

  return {
    summary: String(data.summary || DEGRADED_RESPONSE.summary),
    key_points: keyPoints,
    citations,
    confidence: clamp01(data.confidence),
    warnings,
    source,
    cost_saved: Boolean(data.cost_saved),
  };
}

// ============================================================
// MAIN
// ============================================================

export async function verifyLegalContext(request: LegalVerifyRequest): Promise<LegalVerifyResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("legal-verify", { body: request });
    if (error) return { ...DEGRADED_RESPONSE };
    return normalizeResponse(data);
  } catch {
    return { ...DEGRADED_RESPONSE };
  }
}

// ============================================================
// HELPERS
// ============================================================

export function shouldAutoVerifyLegal(incident: any): boolean {
  const text = `${incident?.titre || ""} ${incident?.faits || ""} ${incident?.dysfonctionnement || ""}`.toLowerCase();
  return LEGAL_KEYWORDS.some((k) => text.includes(k));
}

export function requiresExternalVerification(query: string): boolean {
  const q = (query || "").toLowerCase();
  return EXTERNAL_REQUIRED_KEYWORDS.some((k) => q.includes(k));
}

export function estimateCost(request: LegalVerifyRequest): "free" | "paid" | "maybe_paid" {
  if (request.force_external) return "paid";
  if (request.mode === "jurisprudence") return "paid";
  if (requiresExternalVerification(request.query)) return "paid";
  if (request.mode === "roles" || request.mode === "definitions") return "free";
  return "maybe_paid";
}

export function buildLegalQueryFromIncident(incident: any): LegalVerifyRequest {
  const rawText = `${incident?.titre || ""} ${incident?.faits || ""} ${incident?.dysfonctionnement || ""} ${incident?.institution || ""}`;

  const institutions = Object.entries(INSTITUTION_PATTERNS)
    .filter(([, re]) => re.test(rawText))
    .map(([k]) => k);

  const topics = Object.entries(TOPIC_PATTERNS)
    .filter(([, re]) => re.test(rawText))
    .map(([k]) => k);

  const text = rawText.toLowerCase();

  let mode: LegalVerifyMode = "legal";
  if (/(délai|recours|opposition|combien|jours|quel délai)/i.test(text)) mode = "deadlines";
  else if (/(rôle|compétence|responsabilité)/i.test(text)) mode = "roles";
  else if (/(procédure|étapes|démarche|comment faire)/i.test(text)) mode = "procedure";
  else if (/(définition|signifie|qu'est-ce que)/i.test(text)) mode = "definitions";

  const factsSummary = String(incident?.faits || "").slice(0, 500);

  const queryParts: string[] = [];
  if (incident?.dysfonctionnement) queryParts.push(`Dysfonctionnement: ${incident.dysfonctionnement}`);
  if (topics.length) queryParts.push(`Thèmes: ${topics.join(", ")}`);
  queryParts.push("Quelles sont les bases légales applicables et les références officielles?");

  return {
    query: queryParts.join(" "),
    context: {
      incident_title: incident?.titre || undefined,
      category: incident?.type || undefined,
      event_date: incident?.date_incident || undefined,
      facts_summary: factsSummary || undefined,
      jurisdiction: "CH-VD",
      institutions: institutions.length ? institutions : undefined,
      topics: topics.length ? topics : undefined,
    },
    mode,
    max_citations: 5,
    force_external: false,
  };
}

// ============================================================
// FORMATTERS
// ============================================================

export function formatLegalResult(result: LegalVerifyResponse): string {
  const sourceLabel =
    result.source === "local" ? "Local" : result.source === "external" ? "Externe" : result.source === "hybrid" ? "Hybride" : "Dégradé";

  const lines: string[] = [];
  lines.push(`## Cadre juridique (${sourceLabel})`);
  lines.push("");
  lines.push(`**Confiance:** ${Math.round(clamp01(result.confidence) * 100)}%`);
  if (result.cost_saved) lines.push("**Coût:** économisé (local)");
  lines.push("");
  lines.push("### Résumé");
  lines.push(result.summary);

  if (result.key_points.length) {
    lines.push("");
    lines.push("### Points clés");
    for (const p of result.key_points) lines.push(`- ${p}`);
  }

  if (result.citations.length) {
    lines.push("");
    lines.push("### Sources");
    for (const c of result.citations) lines.push(`- [${c.title}](${c.url})`);
  }

  if (result.warnings?.length) {
    lines.push("");
    lines.push(`> ⚠️ ${result.warnings.join(" • ")}`);
  }

  return lines.join("\n");
}

export function formatLegalResultHTML(result: LegalVerifyResponse): string {
  const sourceLabel =
    result.source === "local" ? "Local" : result.source === "external" ? "Externe" : result.source === "hybrid" ? "Hybride" : "Dégradé";
  const confidencePct = Math.round(clamp01(result.confidence) * 100);

  const warnings = Array.isArray(result.warnings) ? result.warnings : [];

  const keyPointsHtml = result.key_points.length
    ? `<ul>${result.key_points.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`
    : "";

  const citationsHtml = result.citations.length
    ? `<ul>${result.citations
        .map((c) => {
          const href = safeHref(c.url);
          return `<li><a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(c.title)}</a></li>`;
        })
        .join("")}</ul>`
    : "";

  const warningsHtml = warnings.length
    ? `<p><span>${escapeHtml("⚠️ " + warnings.join(" • "))}</span></p>`
    : "";

  return [
    `<div>`,
    `<h3>${escapeHtml("Cadre juridique")}</h3>`,
    `<p><span>${escapeHtml("Source: " + sourceLabel)}</span> <span>${escapeHtml("Confiance: " + String(confidencePct) + "%")}</span></p>`,
    result.cost_saved ? `<p><span>${escapeHtml("Coût économisé (local)")}</span></p>` : "",
    `<p>${escapeHtml(result.summary)}</p>`,
    result.key_points.length ? `<h3>${escapeHtml("Points clés")}</h3>` : "",
    keyPointsHtml,
    result.citations.length ? `<h3>${escapeHtml("Sources")}</h3>` : "",
    citationsHtml,
    warningsHtml,
    `</div>`,
  ].join("");
}

export function getLegalSummaryBadge(result: LegalVerifyResponse): "Non vérifié" | "Partiel" | "Vérifié" {
  const c = clamp01(result.confidence);
  if (result.source === "degraded" || c < 0.4) return "Non vérifié";
  if (result.source === "hybrid" || c < 0.75) return "Partiel";
  return "Vérifié";
}
