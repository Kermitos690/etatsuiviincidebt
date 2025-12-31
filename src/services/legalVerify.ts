import { supabase } from "@/integrations/supabase/client";

// ============================================================
// TYPES
// ============================================================

export type LegalVerifyMode = "legal" | "procedure" | "roles" | "deadlines" | "definitions" | "jurisprudence";

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
  confidence: number;
  warnings?: string[];
  source: "local" | "external" | "hybrid" | "degraded";
  cost_saved: boolean;
}

// ============================================================
// CONSTANTS
// ============================================================

const DEGRADED_RESPONSE: LegalVerifyResponse = {
  summary: "Cadre légal non vérifié – service indisponible",
  key_points: [],
  citations: [],
  confidence: 0.0,
  warnings: ["perplexity_unavailable"],
  source: "degraded",
  cost_saved: false,
};

const LEGAL_KEYWORDS = [
  "lpd", "loi protection données", "données personnelles",
  "droit d'accès", "accès dossier", "traçabilité",
  "curateur", "curatelle", "protection adulte",
  "cc", "code civil", "art. 388", "art. 389", "art. 390",
  "délai", "recours", "opposition", "contestation",
  "jpd", "juge de paix", "autorité protection",
];

const EXTERNAL_REQUIRED_KEYWORDS = [
  "jurisprudence", "atf", "arrêt", "tribunal fédéral",
  "décision", "jugement", "recours accepté", "recours rejeté",
  "délai exact", "combien de jours", "quel délai précis",
];

const INSTITUTION_PATTERNS: Record<string, string[]> = {
  "JDP": ["juge de paix", "jdp", "justice de paix"],
  "SCTP": ["sctp", "service des curatelles", "tutelles"],
  "CSR": ["csr", "centre social régional"],
  "AI": ["ai", "assurance invalidité", "office ai"],
  "APEA": ["apea", "autorité protection enfant adulte"],
};

const TOPIC_PATTERNS: Record<string, string[]> = {
  "LPD": ["lpd", "données personnelles", "protection données", "droit d'accès", "traçabilité"],
  "CC": ["code civil", "protection adulte", "curateur", "curatelle", "art. 388", "art. 389"],
  "LPGA": ["lpga", "assurances sociales", "partie générale"],
  "LAI": ["lai", "assurance invalidité", "invalidité"],
};

// ============================================================
// HTML ESCAPE FUNCTION (FIXED)
// ============================================================

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ============================================================
// MAIN FUNCTION
// ============================================================

export async function verifyLegalContext(request: LegalVerifyRequest): Promise<LegalVerifyResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("legal-verify", {
      body: request,
    });

    if (error) {
      console.error("[legalVerify] Edge function error:", error);
      return DEGRADED_RESPONSE;
    }

    if (!data || typeof data.summary !== "string") {
      console.error("[legalVerify] Invalid response structure");
      return DEGRADED_RESPONSE;
    }

    return {
      summary: data.summary,
      key_points: Array.isArray(data.key_points) ? data.key_points : [],
      citations: Array.isArray(data.citations) ? data.citations : [],
      confidence: Math.max(0, Math.min(1, Number(data.confidence) || 0)),
      warnings: Array.isArray(data.warnings) ? data.warnings : undefined,
      source: data.source || "external",
      cost_saved: Boolean(data.cost_saved),
    };
  } catch (e) {
    console.error("[legalVerify] Exception:", e);
    return DEGRADED_RESPONSE;
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function shouldAutoVerifyLegal(incident: {
  titre?: string;
  faits?: string;
  dysfonctionnement?: string;
  type?: string;
}): boolean {
  const text = ((incident.titre || "") + " " + (incident.faits || "") + " " + (incident.dysfonctionnement || "")).toLowerCase();

  for (const keyword of LEGAL_KEYWORDS) {
    if (text.includes(keyword)) {
      return true;
    }
  }

  return false;
}

export function requiresExternalVerification(query: string): boolean {
  const queryLower = query.toLowerCase();

  for (const keyword of EXTERNAL_REQUIRED_KEYWORDS) {
    if (queryLower.includes(keyword)) {
      return true;
    }
  }

  return false;
}

export function estimateCost(request: LegalVerifyRequest): "free" | "paid" | "maybe_paid" {
  if (request.force_external) {
    return "paid";
  }

  if (request.mode === "jurisprudence") {
    return "paid";
  }

  if (requiresExternalVerification(request.query)) {
    return "paid";
  }

  if (request.mode === "roles" || request.mode === "definitions") {
    return "free";
  }

  return "maybe_paid";
}

export function buildLegalQueryFromIncident(incident: {
  titre?: string;
  faits?: string;
  dysfonctionnement?: string;
  type?: string;
  institution?: string;
  date_incident?: string;
}): LegalVerifyRequest {
  const text = ((incident.titre || "") + " " + (incident.faits || "") + " " + (incident.dysfonctionnement || "")).toLowerCase();

  const institutions: string[] = [];
  for (const [code, patterns] of Object.entries(INSTITUTION_PATTERNS)) {
    for (const pattern of patterns) {
      if (text.includes(pattern)) {
        institutions.push(code);
        break;
      }
    }
  }

  const topics: string[] = [];
  for (const [topic, patterns] of Object.entries(TOPIC_PATTERNS)) {
    for (const pattern of patterns) {
      if (text.includes(pattern)) {
        topics.push(topic);
        break;
      }
    }
  }

  let mode: LegalVerifyMode = "legal";
  if (text.includes("délai") || text.includes("recours") || text.includes("opposition")) {
    mode = "deadlines";
  } else if (text.includes("rôle") || text.includes("compétence") || text.includes("responsabilité")) {
    mode = "roles";
  } else if (text.includes("procédure") || text.includes("étapes") || text.includes("démarche")) {
    mode = "procedure";
  } else if (text.includes("définition") || text.includes("signifie") || text.includes("qu'est-ce")) {
    mode = "definitions";
  }

  const queryParts: string[] = [];
  if (incident.dysfonctionnement) {
    queryParts.push("Dysfonctionnement: " + incident.dysfonctionnement);
  }
  if (topics.length > 0) {
    queryParts.push("Domaines: " + topics.join(", "));
  }
  queryParts.push("Quelles sont les bases légales applicables?");

  return {
    query: queryParts.join(" "),
    context: {
      incident_title: incident.titre,
      category: incident.type,
      event_date: incident.date_incident,
      facts_summary: incident.faits?.slice(0, 500),
      jurisdiction: "CH-VD",
      institutions: institutions.length > 0 ? institutions : undefined,
      topics: topics.length > 0 ? topics : undefined,
    },
    mode,
    max_citations: 5,
    force_external: false,
  };
}

// ============================================================
// FORMATTING FUNCTIONS
// ============================================================

export function formatLegalResult(result: LegalVerifyResponse): string {
  const lines: string[] = [];

  let sourceBadge = "⚠️ Dégradé";
  if (result.source === "local") sourceBadge = "📚 Local";
  else if (result.source === "external") sourceBadge = "🌐 Externe";
  else if (result.source === "hybrid") sourceBadge = "🔗 Hybride";

  let confidenceBadge = "🔴";
  if (result.confidence >= 0.8) confidenceBadge = "🟢";
  else if (result.confidence >= 0.5) confidenceBadge = "🟡";

  lines.push("## Cadre juridique " + sourceBadge);
  lines.push("");
  lines.push("**Confiance:** " + confidenceBadge + " " + Math.round(result.confidence * 100) + "%");

  if (result.cost_saved) {
    lines.push("💰 *Coût économisé (sources locales)*");
  }
  lines.push("");

  lines.push("### Résumé");
  lines.push(result.summary);
  lines.push("");

  if (result.key_points.length > 0) {
    lines.push("### Points clés");
    for (const point of result.key_points) {
      lines.push("- " + point);
    }
    lines.push("");
  }

  if (result.citations.length > 0) {
    lines.push("### Sources");
    for (const citation of result.citations) {
      lines.push("- [" + citation.title + "](" + citation.url + ")");
    }
    lines.push("");
  }

  if (result.warnings && result.warnings.length > 0) {
    const warningMessages = result.warnings.map(w => {
      if (w === "cache_hit") return "Résultat mis en cache";
      if (w === "no_citations") return "Aucune source trouvée";
      if (w === "perplexity_unavailable") return "Service externe indisponible";
      if (w === "fallback_to_local") return "Utilisation du référentiel local";
      if (w.startsWith("gatekeeper:")) return "Décision: " + w.replace("gatekeeper:", "");
      return w;
    });
    lines.push("> ⚠️ " + warningMessages.join(" • "));
  }

  return lines.join("\n");
}

export function formatLegalResultHTML(result: LegalVerifyResponse): string {
  let sourceBadgeClass = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
  let sourceBadgeText = "⚠️ Dégradé";

  if (result.source === "local") {
    sourceBadgeClass = "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    sourceBadgeText = "📚 Local";
  } else if (result.source === "external") {
    sourceBadgeClass = "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    sourceBadgeText = "🌐 Externe";
  } else if (result.source === "hybrid") {
    sourceBadgeClass = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    sourceBadgeText = "🔗 Hybride";
  }

  let confidenceClass = "text-red-600 dark:text-red-400";
  if (result.confidence >= 0.8) {
    confidenceClass = "text-green-600 dark:text-green-400";
  } else if (result.confidence >= 0.5) {
    confidenceClass = "text-yellow-600 dark:text-yellow-400";
  }

  let html = '<div class="legal-result space-y-4">';

  // Header with badges
  html += '<div class="flex items-center gap-2 flex-wrap">';
  html += '<h3 class="text-lg font-semibold">Cadre juridique</h3>';
  html += '<span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium ' + sourceBadgeClass + '">' + escapeHtml(sourceBadgeText) + '</span>';
  html += '<span class="text-sm font-medium ' + confidenceClass + '">' + Math.round(result.confidence * 100) + '% confiance</span>';
  if (result.cost_saved) {
    html += '<span class="text-xs text-muted-foreground">💰 Économisé</span>';
  }
  html += '</div>';

  // Summary
  html += '<p class="text-sm">' + escapeHtml(result.summary) + '</p>';

  // Key points
  if (result.key_points.length > 0) {
    html += '<div class="space-y-1">';
    html += '<h4 class="text-sm font-medium">Points clés</h4>';
    html += '<ul class="list-disc list-inside text-sm space-y-1">';
    for (const point of result.key_points) {
      html += '<li>' + escapeHtml(point) + '</li>';
    }
    html += '</ul>';
    html += '</div>';
  }

  // Citations
  if (result.citations.length > 0) {
    html += '<div class="space-y-1">';
    html += '<h4 class="text-sm font-medium">Sources</h4>';
    html += '<ul class="text-sm space-y-1">';
    for (const citation of result.citations) {
      html += '<li>';
      html += '<a href="' + escapeHtml(citation.url) + '" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">';
      html += escapeHtml(citation.title);
      html += '</a>';
      html += '</li>';
    }
    html += '</ul>';
    html += '</div>';
  }

  // Warnings
  if (result.warnings && result.warnings.length > 0) {
    html += '<div class="text-xs text-muted-foreground bg-muted/50 p-2 rounded">';
    html += '⚠️ ' + escapeHtml(result.warnings.join(" • "));
    html += '</div>';
  }

  html += '</div>';
  return html;
}

export function getLegalSummaryBadge(result: LegalVerifyResponse): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: string;
} {
  if (result.source === "degraded" || result.confidence < 0.3) {
    return { label: "Non vérifié", variant: "destructive", icon: "⚠️" };
  }
  if (result.confidence >= 0.7) {
    return { label: "Vérifié", variant: "default", icon: "✓" };
  }
  return { label: "Partiel", variant: "secondary", icon: "◐" };
}
