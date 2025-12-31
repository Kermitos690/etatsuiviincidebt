import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

interface LegalVerifyResponse {
  summary: string;
  key_points: string[];
  citations: Array<{ title: string; url: string }>;
  confidence: number;
}

const DEGRADED_RESPONSE: LegalVerifyResponse = {
  summary: "Cadre légal non vérifié – service externe indisponible",
  key_points: [],
  citations: [],
  confidence: 0.0
};

function buildSystemPrompt(mode: string, context: LegalVerifyRequest['context']): string {
  const jurisdiction = context?.jurisdiction || 'CH-VD';
  const institutions = context?.institutions?.join(', ') || 'institutions suisses';
  const topics = context?.topics?.join(', ') || 'droit administratif suisse';

  const modeInstructions: Record<string, string> = {
    legal: `Recherche les bases légales suisses applicables (Code civil, LPD, LPGA, LAI, droit cantonal vaudois). 
            Cite uniquement des articles de loi officiels avec leurs références exactes.`,
    procedure: `Décris les procédures administratives officielles en Suisse (${jurisdiction}). 
                Focus sur les étapes, délais, et obligations des parties.`,
    roles: `Explique les rôles et compétences des acteurs institutionnels concernés (${institutions}). 
            Précise les limites de compétence et les voies de recours.`,
    deadlines: `Identifie les délais légaux applicables (recours, prescription, péremption). 
                Cite les bases légales exactes pour chaque délai mentionné.`,
    definitions: `Fournis les définitions juridiques officielles des concepts mentionnés. 
                  Base-toi sur la doctrine suisse et les textes de loi.`,
    jurisprudence: `Recherche la jurisprudence suisse pertinente (ATF, arrêts cantonaux). 
                    Cite les références exactes des décisions.`
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
1. Ne jamais affirmer "la loi dit..." ou "le délai est de..." sans citer la source exacte
2. Privilégier les sources officielles: admin.ch, vd.ch, tribunaux fédéraux/cantonaux
3. Si une information ne peut être vérifiée, l'indiquer clairement
4. Rester factuel, neutre, sans interprétation émotionnelle
5. Maximum 5 sources pertinentes
6. Répondre en français

FORMAT DE RÉPONSE (JSON strict):
{
  "summary": "Résumé clair et compréhensible par un non-juriste",
  "key_points": ["Point essentiel 1", "Point essentiel 2", ...],
  "citations": [{"title": "Source officielle", "url": "https://..."}, ...],
  "confidence": 0.0 à 1.0
}

La confidence doit refléter:
- 0.9-1.0: Sources officielles multiples et concordantes
- 0.7-0.9: Sources officielles mais partielles
- 0.5-0.7: Sources mixtes ou indirectes
- 0.0-0.5: Informations à vérifier, sources insuffisantes`;
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

    const body: LegalVerifyRequest = await req.json();
    
    if (!body.query || typeof body.query !== 'string' || body.query.trim().length < 10) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Query requise (min 10 caractères)'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const mode = body.mode || 'legal';
    const maxCitations = Math.min(body.max_citations || 5, 10);
    const systemPrompt = buildSystemPrompt(mode, body.context);

    console.log(`[legal-verify] Mode: ${mode}, Query length: ${body.query.length}`);

    // Call Perplexity API
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
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
        search_domain_filter: [
          'admin.ch',
          'vd.ch',
          'bger.ch',
          'fedlex.admin.ch',
          'ch.ch',
          'edoeb.admin.ch'
        ],
        return_citations: true,
        max_tokens: 2000
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error(`[legal-verify] Perplexity error ${perplexityResponse.status}: ${errorText}`);
      
      // Return degraded response instead of throwing
      return new Response(JSON.stringify(DEGRADED_RESPONSE), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const perplexityData = await perplexityResponse.json();
    const content = perplexityData.choices?.[0]?.message?.content || '';
    const externalCitations = perplexityData.citations || [];

    // Try to parse JSON from response
    let result: LegalVerifyResponse;
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          summary: parsed.summary || content.substring(0, 500),
          key_points: Array.isArray(parsed.key_points) ? parsed.key_points.slice(0, 5) : [],
          citations: [],
          confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5
        };
      } else {
        // Fallback: use raw content
        result = {
          summary: content.substring(0, 1000),
          key_points: [],
          citations: [],
          confidence: 0.4
        };
      }
    } catch {
      // JSON parse failed, use raw response
      result = {
        summary: content.substring(0, 1000),
        key_points: [],
        citations: [],
        confidence: 0.3
      };
    }

    // Add external citations from Perplexity
    if (externalCitations.length > 0) {
      result.citations = externalCitations
        .slice(0, maxCitations)
        .map((url: string) => ({
          title: extractTitleFromUrl(url),
          url
        }));
      
      // Boost confidence if we have official sources
      const hasOfficialSources = result.citations.some(c => 
        c.url.includes('admin.ch') || 
        c.url.includes('vd.ch') || 
        c.url.includes('bger.ch') ||
        c.url.includes('fedlex')
      );
      
      if (hasOfficialSources && result.confidence < 0.7) {
        result.confidence = Math.min(0.85, result.confidence + 0.2);
      }
    }

    // Lower confidence if no citations
    if (result.citations.length === 0) {
      result.confidence = Math.min(result.confidence, 0.4);
      result.summary += "\n\n⚠️ Aucune source officielle trouvée – à vérifier.";
    }

    const latency = Date.now() - startTime;
    console.log(`[legal-verify] Complete. Mode: ${mode}, Confidence: ${result.confidence}, Latency: ${latency}ms`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const latency = Date.now() - startTime;
    console.error(`[legal-verify] Error after ${latency}ms:`, error);
    
    // Always return degraded response, never throw
    return new Response(JSON.stringify(DEGRADED_RESPONSE), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function extractTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace('www.', '');
    
    // Known official sources
    const sourceNames: Record<string, string> = {
      'admin.ch': 'Confédération suisse',
      'vd.ch': 'Canton de Vaud',
      'bger.ch': 'Tribunal fédéral',
      'fedlex.admin.ch': 'Fedlex - Droit fédéral',
      'ch.ch': 'Portail suisse',
      'edoeb.admin.ch': 'Préposé protection données',
      'bfs.admin.ch': 'Office fédéral de la statistique',
      'seco.admin.ch': 'SECO',
    };

    for (const [domain, name] of Object.entries(sourceNames)) {
      if (hostname.includes(domain.split('.')[0])) {
        return name;
      }
    }

    return hostname;
  } catch {
    return 'Source externe';
  }
}
