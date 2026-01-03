import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailData {
  id: string;
  sender: string;
  recipient?: string;
  subject: string;
  body: string;
  received_at: string;
  is_sent?: boolean;
}

interface DeepAnalysisResult {
  causal_chain: Array<{
    cause: string;
    citation: string;
    consequence: string;
    impact: string;
    date?: string;
  }>;
  excuses_detected: Array<{
    actor: string;
    excuse: string;
    citation: string;
    legal_obligation: string;
    legal_article: string;
    is_valid: boolean;
    counter_argument: string;
  }>;
  behavioral_contradictions: Array<{
    actor: string;
    action_1: string;
    action_1_date?: string;
    action_2: string;
    action_2_date?: string;
    contradiction: string;
    severity: 'minor' | 'moderate' | 'major';
  }>;
  deadline_analysis: Array<{
    event: string;
    event_date?: string;
    discovery_date?: string;
    deadline_date?: string;
    legal_deadline_days?: number;
    remaining_days?: number;
    impact: string;
    citation: string;
    legal_basis: string;
  }>;
  cascade_failures: Array<{
    step: number;
    failure: string;
    date?: string;
    leads_to: string;
    responsibility: string;
  }>;
  responsibilities: Array<{
    actor: string;
    role: string;
    failures: string[];
    legal_violations: string[];
    mitigating_factors: string[];
    severity_score: number;
  }>;
  synthesis: {
    main_dysfunction: string;
    root_cause: string;
    aggravating_factors: string[];
    rights_violated: string[];
    recommended_actions: string[];
    severity_assessment: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emails, faits, dysfonctionnement, incidentType, institution } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'API key not configured',
        analysis: null 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build email context
    const emailContext = (emails || []).map((e: EmailData, i: number) => 
      `[Email ${i + 1}] De: ${e.sender} | Date: ${e.received_at}\nObjet: ${e.subject}\n${e.body.substring(0, 2000)}`
    ).join('\n\n---\n\n');

    const systemPrompt = `Tu es un expert juridique suisse spécialisé dans l'analyse approfondie de dysfonctionnements institutionnels et de protection de l'adulte.

Ton rôle est d'analyser les faits et emails pour produire une analyse structurée comprenant:
1. Chaîne causale: identifier les causes, citations exactes, conséquences et impacts
2. Excuses vs obligations légales: détecter les excuses avancées et les confronter aux obligations légales suisses
3. Contradictions comportementales: repérer les incohérences dans les actions des acteurs
4. Analyse des délais: identifier les délais légaux violés ou en danger
5. Défaillances en cascade: montrer comment une erreur entraîne les suivantes
6. Responsabilités: attribuer les responsabilités avec score de sévérité (1-10)
7. Synthèse: dysfonctionnement principal, cause racine, facteurs aggravants, droits violés, actions recommandées

Tu dois retourner un JSON structuré conforme au schéma DeepAnalysisResult.
Cite toujours des passages exacts des emails entre guillemets.
Référence les articles de loi suisse pertinents (CC, CPC, CPA, LPJA, etc.).`;

    const userPrompt = `Analyse approfondie de l'incident suivant:

INSTITUTION: ${institution}
TYPE: ${incidentType}

FAITS CONSTATÉS:
${faits}

DYSFONCTIONNEMENT:
${dysfonctionnement}

CORRESPONDANCE EMAIL:
${emailContext || 'Aucun email fourni'}

Produis une analyse JSON complète selon le schéma DeepAnalysisResult. Sois exhaustif et cite des passages exacts.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'deep_analysis',
            description: 'Retourne une analyse approfondie structurée de l\'incident',
            parameters: {
              type: 'object',
              properties: {
                causal_chain: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      cause: { type: 'string' },
                      citation: { type: 'string' },
                      consequence: { type: 'string' },
                      impact: { type: 'string' },
                      date: { type: 'string' }
                    },
                    required: ['cause', 'citation', 'consequence', 'impact']
                  }
                },
                excuses_detected: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      actor: { type: 'string' },
                      excuse: { type: 'string' },
                      citation: { type: 'string' },
                      legal_obligation: { type: 'string' },
                      legal_article: { type: 'string' },
                      is_valid: { type: 'boolean' },
                      counter_argument: { type: 'string' }
                    },
                    required: ['actor', 'excuse', 'legal_obligation', 'is_valid', 'counter_argument']
                  }
                },
                behavioral_contradictions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      actor: { type: 'string' },
                      action_1: { type: 'string' },
                      action_1_date: { type: 'string' },
                      action_2: { type: 'string' },
                      action_2_date: { type: 'string' },
                      contradiction: { type: 'string' },
                      severity: { type: 'string', enum: ['minor', 'moderate', 'major'] }
                    },
                    required: ['actor', 'action_1', 'action_2', 'contradiction', 'severity']
                  }
                },
                deadline_analysis: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      event: { type: 'string' },
                      event_date: { type: 'string' },
                      deadline_date: { type: 'string' },
                      legal_deadline_days: { type: 'number' },
                      remaining_days: { type: 'number' },
                      impact: { type: 'string' },
                      citation: { type: 'string' },
                      legal_basis: { type: 'string' }
                    },
                    required: ['event', 'impact', 'legal_basis']
                  }
                },
                cascade_failures: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      step: { type: 'number' },
                      failure: { type: 'string' },
                      date: { type: 'string' },
                      leads_to: { type: 'string' },
                      responsibility: { type: 'string' }
                    },
                    required: ['step', 'failure', 'leads_to', 'responsibility']
                  }
                },
                responsibilities: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      actor: { type: 'string' },
                      role: { type: 'string' },
                      failures: { type: 'array', items: { type: 'string' } },
                      legal_violations: { type: 'array', items: { type: 'string' } },
                      mitigating_factors: { type: 'array', items: { type: 'string' } },
                      severity_score: { type: 'number' }
                    },
                    required: ['actor', 'role', 'failures', 'severity_score']
                  }
                },
                synthesis: {
                  type: 'object',
                  properties: {
                    main_dysfunction: { type: 'string' },
                    root_cause: { type: 'string' },
                    aggravating_factors: { type: 'array', items: { type: 'string' } },
                    rights_violated: { type: 'array', items: { type: 'string' } },
                    recommended_actions: { type: 'array', items: { type: 'string' } },
                    severity_assessment: { type: 'string' }
                  },
                  required: ['main_dysfunction', 'root_cause', 'severity_assessment']
                }
              },
              required: ['causal_chain', 'synthesis']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'deep_analysis' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `AI API error: ${response.status}`,
        analysis: null 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error('No tool call in response');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid AI response format',
        analysis: null 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const analysis: DeepAnalysisResult = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ 
      success: true, 
      analysis 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Deep analysis error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      analysis: null 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
