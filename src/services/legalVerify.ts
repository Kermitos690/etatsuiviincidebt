import { supabase } from "@/integrations/supabase/client";

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
}

const DEGRADED_RESPONSE: LegalVerifyResponse = {
  summary: "Cadre légal non vérifié – service externe indisponible",
  key_points: [],
  citations: [],
  confidence: 0.0
};

/**
 * Appelle l'Edge Function legal-verify pour vérifier le cadre légal
 * via Perplexity. Ne throw jamais, retourne toujours un objet valide.
 */
export async function verifyLegalContext(
  request: LegalVerifyRequest
): Promise<LegalVerifyResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('legal-verify', {
      body: request
    });

    if (error) {
      console.error('[legalVerify] Edge function error:', error);
      return DEGRADED_RESPONSE;
    }

    // Validate response structure
    if (!data || typeof data.summary !== 'string') {
      console.warn('[legalVerify] Invalid response structure');
      return DEGRADED_RESPONSE;
    }

    return {
      summary: data.summary || '',
      key_points: Array.isArray(data.key_points) ? data.key_points : [],
      citations: Array.isArray(data.citations) ? data.citations : [],
      confidence: typeof data.confidence === 'number' ? data.confidence : 0
    };
  } catch (err) {
    console.error('[legalVerify] Unexpected error:', err);
    return DEGRADED_RESPONSE;
  }
}

/**
 * Vérifie si un incident nécessite une vérification légale automatique
 * basée sur ses topics/tags
 */
export function shouldAutoVerifyLegal(incident: {
  type?: string;
  titre?: string;
  faits?: string;
  dysfonctionnement?: string;
}): boolean {
  const legalKeywords = [
    'lpd', 'protection des données', 'accès dossier', 'délai',
    'recours', 'procédure', 'traçabilité', 'obligation légale',
    'violation', 'droit d\'être entendu', 'art.', 'article'
  ];

  const content = [
    incident.type,
    incident.titre,
    incident.faits,
    incident.dysfonctionnement
  ].filter(Boolean).join(' ').toLowerCase();

  return legalKeywords.some(keyword => content.includes(keyword));
}

/**
 * Construit une requête de vérification légale à partir d'un incident
 */
export function buildLegalQueryFromIncident(incident: {
  titre: string;
  type?: string;
  faits?: string;
  institution?: string;
  dateIncident?: string;
}): LegalVerifyRequest {
  // Déterminer le mode approprié
  let mode: LegalVerifyRequest['mode'] = 'legal';
  const contentLower = `${incident.titre} ${incident.faits || ''}`.toLowerCase();
  
  if (contentLower.includes('délai') || contentLower.includes('recours')) {
    mode = 'deadlines';
  } else if (contentLower.includes('procédure') || contentLower.includes('étape')) {
    mode = 'procedure';
  } else if (contentLower.includes('compétence') || contentLower.includes('rôle')) {
    mode = 'roles';
  }

  // Extraire les institutions mentionnées
  const institutions: string[] = [];
  const institutionPatterns = [
    'JDP', 'Justice de paix', 'SCTP', 'SCP', 'Service de curatelles',
    'CSR', 'Centre social', 'AI', 'Assurance-invalidité',
    'Tribunal', 'Préposé'
  ];
  
  for (const pattern of institutionPatterns) {
    if (contentLower.includes(pattern.toLowerCase())) {
      institutions.push(pattern);
    }
  }

  // Extraire les topics
  const topics: string[] = [];
  const topicPatterns = [
    { pattern: 'lpd', topic: 'LPD - Protection des données' },
    { pattern: 'accès', topic: 'Droit d\'accès au dossier' },
    { pattern: 'délai', topic: 'Délais légaux' },
    { pattern: 'recours', topic: 'Voies de recours' },
    { pattern: 'traçabilité', topic: 'Obligation de traçabilité' },
    { pattern: 'curatelle', topic: 'Protection de l\'adulte' },
    { pattern: 'décision', topic: 'Décisions administratives' }
  ];

  for (const { pattern, topic } of topicPatterns) {
    if (contentLower.includes(pattern)) {
      topics.push(topic);
    }
  }

  // Construire la query
  const query = `
Dans le contexte de la protection de l'adulte en Suisse (Canton de Vaud):

Incident: ${incident.titre}
${incident.faits ? `Faits: ${incident.faits.substring(0, 500)}` : ''}

Questions:
1. Quelles sont les bases légales applicables à cette situation?
2. Quelles sont les obligations des institutions concernées?
3. Quels sont les délais et voies de recours possibles?
4. Y a-t-il des violations potentielles à signaler?

Fournir uniquement des informations vérifiables avec sources officielles.
  `.trim();

  return {
    query,
    context: {
      incident_title: incident.titre,
      category: incident.type,
      event_date: incident.dateIncident,
      facts_summary: incident.faits?.substring(0, 300),
      jurisdiction: 'CH-VD',
      institutions: institutions.length > 0 ? institutions : undefined,
      topics: topics.length > 0 ? topics : undefined
    },
    mode,
    max_citations: 5
  };
}

/**
 * Formatte le résultat de vérification légale pour affichage
 */
export function formatLegalResult(result: LegalVerifyResponse): string {
  if (result.confidence === 0) {
    return result.summary;
  }

  let formatted = `## Cadre légal\n\n${result.summary}\n`;

  if (result.key_points.length > 0) {
    formatted += '\n### Points clés\n';
    result.key_points.forEach(point => {
      formatted += `- ${point}\n`;
    });
  }

  if (result.citations.length > 0) {
    formatted += '\n### Sources\n';
    result.citations.forEach(citation => {
      formatted += `- [${citation.title}](${citation.url})\n`;
    });
  }

  const confidenceLabel = result.confidence >= 0.8 
    ? '✅ Haute confiance' 
    : result.confidence >= 0.5 
      ? '⚠️ Confiance moyenne' 
      : '❓ À vérifier';
  
  formatted += `\n*${confidenceLabel} (${Math.round(result.confidence * 100)}%)*`;

  return formatted;
}
