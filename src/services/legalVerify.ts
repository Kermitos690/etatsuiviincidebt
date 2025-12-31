import { supabase } from "@/integrations/supabase/client";

// ============================================================
// TYPES
// ============================================================

export interface LegalVerifyContext {
  incident_title?: string;
  category?: string;
  event_date?: string;
  facts_summary?: string;
  jurisdiction?: string;
  institutions?: string[];
  topics?: string[];
}

export interface LegalVerifyRequest {
  query: string;
  context?: LegalVerifyContext;
  mode?: 'legal' | 'procedure' | 'roles' | 'deadlines' | 'definitions' | 'jurisprudence';
  max_citations?: number;
  force_external?: boolean; // Force Perplexity call
}

export interface LegalCitation {
  title: string;
  url: string;
}

export interface LegalVerifyResponse {
  summary: string;
  key_points: string[];
  citations: LegalCitation[];
  confidence: number;
  warnings?: string[];
  source: 'local' | 'external' | 'hybrid' | 'degraded';
  cost_saved?: boolean;
}

// ============================================================
// CONSTANTS
// ============================================================

const DEGRADED_RESPONSE: LegalVerifyResponse = {
  summary: "Cadre légal non vérifié – service externe indisponible",
  key_points: [],
  citations: [],
  confidence: 0.0,
  warnings: ['perplexity_unavailable'],
  source: 'degraded'
};

// Keywords that trigger automatic legal verification
const LEGAL_KEYWORDS = [
  'lpd', 'protection des données', 'données personnelles',
  'accès dossier', 'accès au dossier', 'consultation dossier',
  'délai', 'délais', 'prescription', 'péremption',
  'recours', 'opposition', 'contestation',
  'procédure', 'procédural', 'procéduraux',
  'traçabilité', 'journalisation', 'audit',
  'obligation légale', 'base légale', 'fondement légal',
  'violation', 'infraction', 'manquement',
  'droit d\'être entendu', 'audition',
  'art.', 'article', 'al.', 'alinéa',
  'curatelle', 'curateur', 'protection de l\'adulte',
  'justice de paix', 'tribunal', 'autorité de surveillance'
];

// Keywords that REQUIRE external verification (expensive, but necessary)
const EXTERNAL_REQUIRED_KEYWORDS = [
  'jurisprudence', 'atf', 'arrêt',
  'article précis', 'référence exacte',
  'quel délai exact', 'combien de jours précisément'
];

// Institution patterns
const INSTITUTION_PATTERNS = [
  { pattern: /\bjdp\b|justice\s+de\s+paix/gi, name: 'Justice de paix' },
  { pattern: /\bsctp\b|\bscp\b|service\s+(de\s+)?curatelles?/gi, name: 'Service de curatelles' },
  { pattern: /\bcsr\b|centre\s+social\s+régional/gi, name: 'CSR' },
  { pattern: /\bai\b|assurance[- ]invalidité/gi, name: 'Assurance-invalidité' },
  { pattern: /\bpfpdt\b|préposé.*protection.*données/gi, name: 'Préposé protection données' },
  { pattern: /tribunal\s+(cantonal|fédéral)/gi, name: 'Tribunal' },
  { pattern: /autorité\s+de\s+surveillance/gi, name: 'Autorité de surveillance' }
];

// Topic patterns
const TOPIC_PATTERNS = [
  { pattern: /lpd|protection\s+des?\s+données/gi, topic: 'LPD - Protection des données' },
  { pattern: /accès.*dossier|consultation.*dossier/gi, topic: 'Droit d\'accès au dossier' },
  { pattern: /délai|prescription|péremption/gi, topic: 'Délais légaux' },
  { pattern: /recours|opposition|contestation/gi, topic: 'Voies de recours' },
  { pattern: /traçabilité|journalisation|audit/gi, topic: 'Obligation de traçabilité' },
  { pattern: /curatelle|protection.*adulte/gi, topic: 'Protection de l\'adulte' },
  { pattern: /décision\s+admin/gi, topic: 'Décisions administratives' },
  { pattern: /droit.*entendu|audition/gi, topic: 'Droit d\'être entendu' }
];

// ============================================================
// MAIN API FUNCTION
// ============================================================

/**
 * Appelle l'Edge Function legal-verify pour vérifier le cadre légal.
 * Stratégie hybride: local d'abord, Perplexity seulement si nécessaire.
 * Ne throw jamais, retourne toujours un objet valide.
 */
export async function verifyLegalContext(
  request: LegalVerifyRequest
): Promise<LegalVerifyResponse> {
  try {
    console.log(`[legalVerify] Calling legal-verify - Mode: ${request.mode}, ForceExternal: ${request.force_external}`);

    const { data, error } = await supabase.functions.invoke('legal-verify', {
      body: request
    });

    if (error) {
      console.error('[legalVerify] Edge function error:', error.message);
      return DEGRADED_RESPONSE;
    }

    // Validate response structure
    if (!data || typeof data.summary !== 'string') {
      console.warn('[legalVerify] Invalid response structure');
      return DEGRADED_RESPONSE;
    }

    const response: LegalVerifyResponse = {
      summary: data.summary || '',
      key_points: Array.isArray(data.key_points) ? data.key_points : [],
      citations: Array.isArray(data.citations) ? data.citations : [],
      confidence: typeof data.confidence === 'number' ? Math.min(1, Math.max(0, data.confidence)) : 0,
      warnings: Array.isArray(data.warnings) ? data.warnings : undefined,
      source: data.source || 'external',
      cost_saved: data.cost_saved || false
    };

    console.log(`[legalVerify] Response - Source: ${response.source}, Confidence: ${response.confidence}, CostSaved: ${response.cost_saved}`);

    return response;
  } catch (err) {
    console.error('[legalVerify] Unexpected error:', err);
    return DEGRADED_RESPONSE;
  }
}

// ============================================================
// GATEKEEPER FUNCTIONS (Client-side pre-check)
// ============================================================

/**
 * Vérifie si un incident nécessite une vérification légale automatique.
 * Basé sur les keywords dans le contenu.
 */
export function shouldAutoVerifyLegal(incident: {
  type?: string;
  titre?: string;
  faits?: string;
  dysfonctionnement?: string;
}): boolean {
  const content = [
    incident.type,
    incident.titre,
    incident.faits,
    incident.dysfonctionnement
  ].filter(Boolean).join(' ').toLowerCase();

  return LEGAL_KEYWORDS.some(keyword => content.includes(keyword));
}

/**
 * Vérifie si la requête nécessite obligatoirement un appel externe (Perplexity).
 * Utile pour afficher un avertissement sur le coût à l'utilisateur.
 */
export function requiresExternalVerification(query: string): boolean {
  const queryLower = query.toLowerCase();
  return EXTERNAL_REQUIRED_KEYWORDS.some(keyword => queryLower.includes(keyword));
}

/**
 * Estime si l'appel sera coûteux (Perplexity) ou gratuit (local).
 * Retourne: 'free' | 'paid' | 'maybe_paid'
 */
export function estimateCost(request: LegalVerifyRequest): 'free' | 'paid' | 'maybe_paid' {
  if (request.force_external) return 'paid';

  const queryLower = request.query.toLowerCase();
  
  // Jurisprudence mode always paid
  if (request.mode === 'jurisprudence') return 'paid';

  // External keywords = paid
  if (EXTERNAL_REQUIRED_KEYWORDS.some(kw => queryLower.includes(kw))) return 'paid';

  // Definitions and roles often local
  if (request.mode === 'definitions' || request.mode === 'roles') return 'free';

  // General legal/procedure might be either
  return 'maybe_paid';
}

// ============================================================
// QUERY BUILDER
// ============================================================

/**
 * Construit une requête de vérification légale à partir d'un incident.
 * Determine automatiquement le mode et le contexte.
 */
export function buildLegalQueryFromIncident(incident: {
  titre: string;
  type?: string;
  faits?: string;
  dysfonctionnement?: string;
  institution?: string;
  dateIncident?: string;
}): LegalVerifyRequest {
  const fullContent = `${incident.titre} ${incident.faits || ''} ${incident.dysfonctionnement || ''}`;
  
  // Determine mode
  let mode: LegalVerifyRequest['mode'] = 'legal';
  if (/délai|prescription|péremption|recours.*jours/i.test(fullContent)) {
    mode = 'deadlines';
  } else if (/procédure|étapes?|démarche/i.test(fullContent)) {
    mode = 'procedure';
  } else if (/compétence|rôle|responsabilité.*institution/i.test(fullContent)) {
    mode = 'roles';
  } else if (/définition|qu'est-ce|signifie/i.test(fullContent)) {
    mode = 'definitions';
  }

  // Extract institutions
  const institutions: string[] = [];
  for (const { pattern, name } of INSTITUTION_PATTERNS) {
    if (pattern.test(fullContent)) {
      if (!institutions.includes(name)) institutions.push(name);
    }
  }
  if (incident.institution && !institutions.includes(incident.institution)) {
    institutions.push(incident.institution);
  }

  // Extract topics
  const topics: string[] = [];
  for (const { pattern, topic } of TOPIC_PATTERNS) {
    if (pattern.test(fullContent)) {
      if (!topics.includes(topic)) topics.push(topic);
    }
  }

  // Build query
  const query = `
Dans le contexte de la protection de l'adulte en Suisse (Canton de Vaud):

Incident: ${incident.titre}
${incident.faits ? `Faits constatés: ${incident.faits.substring(0, 400)}` : ''}
${incident.dysfonctionnement ? `Dysfonctionnement identifié: ${incident.dysfonctionnement.substring(0, 300)}` : ''}

Questions juridiques:
1. Quelles sont les bases légales suisses applicables à cette situation?
2. Quelles sont les obligations légales des institutions concernées?
3. Quels sont les délais et voies de recours possibles?
4. Y a-t-il des violations potentielles du cadre légal à signaler?

Important: Fournir uniquement des informations vérifiables avec sources officielles.
  `.trim();

  return {
    query,
    context: {
      incident_title: incident.titre,
      category: incident.type,
      event_date: incident.dateIncident,
      facts_summary: incident.faits?.substring(0, 250),
      jurisdiction: 'CH-VD',
      institutions: institutions.length > 0 ? institutions : undefined,
      topics: topics.length > 0 ? topics : undefined
    },
    mode,
    max_citations: 5
  };
}

// ============================================================
// FORMATTING FUNCTIONS
// ============================================================

function getConfidenceBadge(confidence: number): string {
  if (confidence >= 0.8) return '✅ Haute confiance';
  if (confidence >= 0.6) return '⚠️ Confiance moyenne';
  if (confidence >= 0.3) return '❓ À vérifier';
  return '⛔ Non vérifié';
}

function getSourceBadge(source: LegalVerifyResponse['source']): string {
  switch (source) {
    case 'local': return '📚 Référentiel interne';
    case 'external': return '🌐 Vérification externe';
    case 'hybrid': return '🔗 Hybride (interne + externe)';
    case 'degraded': return '⚠️ Service indisponible';
    default: return '';
  }
}

/**
 * Formate le résultat en Markdown.
 */
export function formatLegalResult(result: LegalVerifyResponse): string {
  if (result.source === 'degraded' || result.confidence === 0) {
    return `### ⚠️ Cadre légal non vérifié

${result.summary}

*Service de vérification externe indisponible*`;
  }

  let formatted = `### Cadre légal vérifié

${result.summary}
`;

  if (result.key_points.length > 0) {
    formatted += '\n#### Points clés\n';
    result.key_points.forEach(point => {
      formatted += `- ${point}\n`;
    });
  }

  if (result.citations.length > 0) {
    formatted += '\n#### Sources\n';
    result.citations.forEach(citation => {
      formatted += `- [${citation.title}](${citation.url})\n`;
    });
  }

  // Badges
  const confidenceBadge = getConfidenceBadge(result.confidence);
  const sourceBadge = getSourceBadge(result.source);
  formatted += `\n---\n*${confidenceBadge} (${Math.round(result.confidence * 100)}%) | ${sourceBadge}*`;

  if (result.cost_saved) {
    formatted += '\n*💰 Coût économisé (référentiel local)*';
  }

  // Warnings
  if (result.warnings && result.warnings.length > 0) {
    const warningMessages: Record<string, string> = {
      'no_citations': 'Aucune source citée',
      'no_official_sources': 'Pas de source officielle',
      'partial_sources': 'Sources partiellement officielles',
      'no_local_matches': 'Pas de correspondance locale',
      'json_parse_fallback': 'Réponse reformatée',
      'json_parse_error': 'Erreur de format',
      'perplexity_unavailable': 'Perplexity indisponible',
      'fallback_to_local': 'Fallback sur référentiel local'
    };

    const displayWarnings = result.warnings
      .filter(w => !w.startsWith('gatekeeper:'))
      .map(w => warningMessages[w] || w)
      .join(', ');

    if (displayWarnings) {
      formatted += `\n*Avertissements: ${displayWarnings}*`;
    }
  }

  return formatted;
}

/**
 * Formate le résultat en HTML.
 */
export function formatLegalResultHTML(result: LegalVerifyResponse): string {
  if (result.source === 'degraded' || result.confidence === 0) {
    return `<div class="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
      <p class="text-amber-800 dark:text-amber-200 font-medium">⚠️ Cadre légal non vérifié</p>
      <p class="text-sm text-amber-700 dark:text-amber-300 mt-1">${result.summary}</p>
    </div>`;
  }

  const confidenceBadge = getConfidenceBadge(result.confidence);
  const sourceBadge = getSourceBadge(result.source);

  const badgeColor = result.confidence >= 0.7
    ? 'text-green-700 dark:text-green-400'
    : result.confidence >= 0.5
      ? 'text-amber-700 dark:text-amber-400'
      : 'text-red-700 dark:text-red-400';

  const sourceColor = result.source === 'local'
    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    : result.source === 'hybrid'
      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';

  let html = `<div class="space-y-3">
    <p class="text-sm text-muted-foreground">${result.summary}</p>`;

  if (result.key_points.length > 0) {
    html += `<ul class="list-disc list-inside text-sm space-y-1">`;
    result.key_points.forEach(point => {
      html += `<li>${point}</li>`;
    });
    html += `</ul>`;
  }

  if (result.citations.length > 0) {
    html += `<div class="flex flex-wrap gap-2 pt-2">`;
    result.citations.forEach(citation => {
      const isInternal = citation.title.includes('Référentiel interne');
      const bgClass = isInternal 
        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
        : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      html += `<a href="${citation.url}" target="_blank" rel="noopener" 
        class="inline-flex items-center gap-1 text-xs px-2 py-1 ${bgClass} rounded hover:underline">
        ${isInternal ? '📚' : '📎'} ${citation.title}
      </a>`;
    });
    html += `</div>`;
  }

  html += `<div class="flex items-center gap-3 pt-2">
    <span class="text-xs ${badgeColor}">${confidenceBadge} (${Math.round(result.confidence * 100)}%)</span>
    <span class="text-xs px-2 py-0.5 rounded ${sourceColor}">${sourceBadge}</span>
    ${result.cost_saved ? '<span class="text-xs text-green-600 dark:text-green-400">💰 Coût économisé</span>' : ''}
  </div>`;

  html += `</div>`;

  return html;
}

/**
 * Retourne un résumé court pour affichage en badge/tooltip.
 */
export function getLegalSummaryBadge(result: LegalVerifyResponse): {
  label: string;
  variant: 'success' | 'warning' | 'error' | 'info';
  tooltip: string;
} {
  if (result.source === 'degraded') {
    return {
      label: 'Non vérifié',
      variant: 'error',
      tooltip: 'Service de vérification indisponible'
    };
  }

  if (result.confidence >= 0.7) {
    return {
      label: 'Vérifié',
      variant: 'success',
      tooltip: `${result.citations.length} source(s) - ${result.source === 'local' ? 'Référentiel interne' : 'Vérification externe'}`
    };
  }

  if (result.confidence >= 0.4) {
    return {
      label: 'Partiel',
      variant: 'warning',
      tooltip: 'Sources partielles, à compléter'
    };
  }

  return {
    label: 'À vérifier',
    variant: 'info',
    tooltip: 'Informations insuffisantes'
  };
}
