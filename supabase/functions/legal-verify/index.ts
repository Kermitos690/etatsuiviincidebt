import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface LegalVerifyRequest {
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
  mode?: 'legal' | 'procedure' | 'roles' | 'deadlines' | 'definitions' | 'jurisprudence';
  max_citations?: number;
}

interface LegalCitation {
  title: string;
  url: string;
}

interface LegalVerifyResponse {
  summary: string;
  key_points: string[];
  citations: LegalCitation[];
  confidence: number;
  warnings?: string[];
}

// Domain to official title mapping
const OFFICIAL_DOMAINS: Record<string, string> = {
  'fedlex.admin.ch': 'Fedlex - Droit fédéral',
  'admin.ch': 'Confédération suisse',
  'edoeb.admin.ch': 'Préposé fédéral (PFPDT)',
  'bger.ch': 'Tribunal fédéral',
  'vd.ch': 'Canton de Vaud',
  'ch.ch': 'Portail suisse',
  'bfs.admin.ch': 'Office fédéral de la statistique',
  'seco.admin.ch': 'SECO',
  'bsv.admin.ch': 'Office fédéral des assurances sociales',
  'ejpd.admin.ch': 'Département fédéral de justice',
};

// Priority domains for search
const PRIORITY_DOMAINS = [
  'fedlex.admin.ch',
  'admin.ch',
  'edoeb.admin.ch',
  'bger.ch',
  'vd.ch',
  'ch.ch'
];

// Degraded response constant
const DEGRADED_RESPONSE: LegalVerifyResponse = {
  summary: "Cadre légal non vérifié – service externe indisponible",
  key_points: [],
  citations: [],
  confidence: 0.0,
  warnings: ['perplexity_unavailable']
};

function buildSystemPrompt(mode: string, context: LegalVerifyRequest['context']): string {
  const jurisdiction = context?.jurisdiction || 'CH-VD';
  const institutions = context?.institutions?.join(', ') || 'institutions suisses';
  const topics = context?.topics?.join(', ') || 'droit administratif suisse';

  const modeInstructions: Record<string, string> = {
    legal: `Recherche les bases légales suisses applicables (Code civil, LPD, LPGA, LAI, droit cantonal vaudois). 
            Cite uniquement des articles de loi officiels avec leurs références exactes.`,
    procedure: `Décris les procédures administratives officielles en Suisse (${jurisdiction}). 
                Focus sur les étapes, délais documentés, et obligations des parties. Ne jamais inventer de délai sans source.`,
    roles: `Explique les rôles et compétences des acteurs institutionnels concernés (${institutions}). 
            Précise les limites de compétence et les voies de recours.`,
    deadlines: `Identifie les délais légaux applicables (recours, prescription, péremption). 
                Cite les bases légales exactes pour chaque délai mentionné. Si incertain, l'indiquer explicitement.`,
    definitions: `Fournis les définitions juridiques officielles des concepts mentionnés. 
                  Base-toi sur la doctrine suisse et les textes de loi.`,
    jurisprudence: `Recherche la jurisprudence suisse pertinente (ATF, arrêts cantonaux). 
                    Cite les références exactes des décisions (numéro, date, considérant).`
  };

  return `Tu es un assistant juridique spécialisé en droit suisse, particulièrement en protection de l'adulte et droit administratif.

CONTEXTE:
- Juridiction: ${jurisdiction}
- Institutions concernées: ${institutions}
- Thématiques: ${topics}
${context?.incident_title ? `- Titre incident: ${context.incident_title}` : ''}
${context?.event_date ? `- Date événement: ${context.event_date}` : ''}
${context?.facts_summary ? `- Résumé factuel: ${context.facts_summary}` : ''}

INSTRUCTIONS:
${modeInstructions[mode] || modeInstructions.legal}

RÈGLES STRICTES:
1. Ne JAMAIS affirmer "la loi dit...", "le délai est de...", "l'autorité doit..." SANS citer la source exacte
2. Privilégier les sources officielles: fedlex.admin.ch, admin.ch, bger.ch, vd.ch, edoeb.admin.ch
3. Si une information ne peut être vérifiée avec certitude, l'indiquer clairement ("à vérifier", "source non trouvée")
4. Rester factuel, neutre, sans interprétation émotionnelle ni accusation
5. Maximum 5 sources pertinentes et vérifiables
6. Répondre UNIQUEMENT en français

FORMAT DE RÉPONSE OBLIGATOIRE (JSON strict, pas de texte avant ou après):
{
  "summary": "Résumé clair et compréhensible par un non-juriste (max 300 mots)",
  "key_points": ["Point essentiel 1 avec référence légale si applicable", "Point essentiel 2", ...],
  "citations": [{"title": "Nom source officielle", "url": "https://..."}, ...],
  "confidence": 0.0 à 1.0
}

ÉCHELLE DE CONFIANCE:
- 0.9-1.0: Sources officielles multiples et concordantes
- 0.7-0.9: Sources officielles mais partielles ou uniques
- 0.5-0.7: Sources mixtes ou indirectes
- 0.0-0.5: Informations incertaines, sources insuffisantes`;
}

function extractTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace('www.', '');
    
    // Check exact matches first
    for (const [domain, title] of Object.entries(OFFICIAL_DOMAINS)) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return title;
      }
    }
    
    // Check partial matches for subdomains
    for (const [domain, title] of Object.entries(OFFICIAL_DOMAINS)) {
      if (hostname.includes(domain.split('.')[0])) {
        return title;
      }
    }

    // Return cleaned hostname as fallback
    return hostname.split('.').slice(-2, -1)[0] || 'Source externe';
  } catch {
    return 'Source externe';
  }
}

function isOfficialSource(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return PRIORITY_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

function clampConfidence(value: unknown): number {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return 0.3;
  return Math.min(1, Math.max(0, num));
}

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    
    if (!PERPLEXITY_API_KEY) {
      console.error('[legal-verify] PERPLEXITY_API_KEY not configured');
      return new Response(JSON.stringify(DEGRADED_RESPONSE), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse and validate input
    let body: LegalVerifyRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Invalid JSON body'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (!body.query || typeof body.query !== 'string' || body.query.trim().length < 10) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Query requise (minimum 10 caractères)'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const mode = body.mode || 'legal';
    const maxCitations = Math.min(body.max_citations || 5, 10);
    const systemPrompt = buildSystemPrompt(mode, body.context);

    // Log minimal info (no sensitive content)
    console.log(`[legal-verify] Start - Mode: ${mode}, QueryLen: ${body.query.length}`);

    // Call Perplexity API
    let perplexityResponse: Response;
    try {
      perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: body.query }
          ],
          return_citations: true,
          max_tokens: 2000
        }),
      });
    } catch (fetchError) {
      console.error(`[legal-verify] Fetch error: ${fetchError}`);
      return new Response(JSON.stringify(DEGRADED_RESPONSE), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!perplexityResponse.ok) {
      const status = perplexityResponse.status;
      console.error(`[legal-verify] Perplexity HTTP ${status}`);
      
      // Return degraded response for any Perplexity error
      return new Response(JSON.stringify(DEGRADED_RESPONSE), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let perplexityData: any;
    try {
      perplexityData = await perplexityResponse.json();
    } catch {
      console.error('[legal-verify] Invalid JSON from Perplexity');
      return new Response(JSON.stringify(DEGRADED_RESPONSE), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const content = perplexityData.choices?.[0]?.message?.content || '';
    const externalCitations: string[] = perplexityData.citations || [];

    // Parse response - try JSON extraction
    let result: LegalVerifyResponse;
    const warnings: string[] = [];
    
    try {
      // Try to extract JSON block from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          summary: typeof parsed.summary === 'string' ? parsed.summary : content.substring(0, 500),
          key_points: Array.isArray(parsed.key_points) ? parsed.key_points.slice(0, 5) : [],
          citations: [],
          confidence: clampConfidence(parsed.confidence)
        };
      } else {
        // No JSON found - use raw content
        result = {
          summary: content.substring(0, 1000),
          key_points: [],
          citations: [],
          confidence: 0.3
        };
        warnings.push('json_parse_fallback');
      }
    } catch {
      // JSON parse failed - use raw response
      result = {
        summary: content.substring(0, 1000),
        key_points: [],
        citations: [],
        confidence: 0.25
      };
      warnings.push('json_parse_error');
    }

    // Process external citations from Perplexity
    if (externalCitations.length > 0) {
      result.citations = externalCitations
        .slice(0, maxCitations)
        .map((url: string) => ({
          title: extractTitleFromUrl(url),
          url
        }));
      
      // Check if we have official sources
      const officialCount = result.citations.filter(c => isOfficialSource(c.url)).length;
      const totalCitations = result.citations.length;
      
      if (officialCount === 0 && totalCitations > 0) {
        warnings.push('no_official_sources');
        result.confidence = Math.min(result.confidence, 0.5);
      } else if (officialCount < totalCitations / 2) {
        warnings.push('partial_sources');
      } else if (officialCount > 0 && result.confidence < 0.7) {
        // Boost confidence for official sources
        result.confidence = Math.min(0.85, result.confidence + 0.15);
      }
    }

    // Handle no citations case
    if (result.citations.length === 0) {
      warnings.push('no_citations');
      result.confidence = Math.min(result.confidence, 0.4);
      if (!result.summary.includes('⚠️')) {
        result.summary += "\n\n⚠️ Aucune source officielle trouvée – informations à vérifier.";
      }
    }

    // Add warnings if any
    if (warnings.length > 0) {
      result.warnings = warnings;
    }

    const latency = Date.now() - startTime;
    console.log(`[legal-verify] Done - Mode: ${mode}, Conf: ${result.confidence.toFixed(2)}, Citations: ${result.citations.length}, Latency: ${latency}ms`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const latency = Date.now() - startTime;
    console.error(`[legal-verify] Unexpected error after ${latency}ms:`, error instanceof Error ? error.message : 'Unknown');
    
    // Always return degraded response, never throw
    return new Response(JSON.stringify(DEGRADED_RESPONSE), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
