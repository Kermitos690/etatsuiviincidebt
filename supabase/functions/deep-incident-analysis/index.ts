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

    // Build email context with numbered references
    const emailContext = (emails || []).map((e: EmailData, i: number) => 
      `[EMAIL ${i + 1}]\nDate: ${e.received_at}\nDe: ${e.sender}\nA: ${e.recipient || 'N/A'}\nObjet: ${e.subject}\n---\n${e.body.substring(0, 2500)}\n---`
    ).join('\n\n');

    // Enhanced system prompt for maximum legal precision
    const systemPrompt = `Tu es un expert juridique suisse specialise dans l'analyse approfondie de dysfonctionnements institutionnels, la protection de l'adulte et la procedure administrative.

REGLES STRICTES D'ANALYSE:

1. CITATIONS EXACTES OBLIGATOIRES
   - Chaque affirmation DOIT etre appuyee par une citation VERBATIM des emails
   - Format: "Citation exacte" [EMAIL X, Date]
   - JAMAIS de paraphrase ou de resume sans citation
   - Si tu ne peux pas citer, ecris "Aucune citation disponible"

2. REFERENCES LEGALES PRECISES
   - Cite UNIQUEMENT des articles de loi suisse que tu connais avec certitude
   - Format obligatoire: "Art. XXX al. Y Code/Loi (ex: Art. 389 al. 2 CC)"
   - Codes valides: CC (Code civil), CO (Code des obligations), CPC (Code de procedure civile), 
     CPA (Code de procedure administrative), LPA-VD (Loi procedure administrative Vaud), 
     LVPAE (Loi vaudoise protection adulte enfant), LPD (Loi protection donnees)
   - Si incertain de l'article exact, ecris "Base legale a verifier"
   - NE JAMAIS inventer un numero d'article

3. CHRONOLOGIE ET DELAIS
   - Identifie les dates precises mentionnees dans les emails
   - Calcule les delais reels (jours) entre evenements
   - Compare aux delais legaux: 30 jours (decision administrative), 10 jours (recours)
   - Signale tout depassement avec la citation source

4. ANALYSE DES ACTEURS
   - Identifie chaque acteur par son role institutionnel
   - Documente ses engagements vs ses actions
   - Releve les contradictions avec preuves

5. HIERARCHIE DES GRAVITES
   - minor: Retard < 15 jours, oubli sans consequence
   - moderate: Retard 15-60 jours, manque communication, procedure incomplète
   - major: Retard > 60 jours, violation droits fondamentaux, prejudice grave

INSTITUTION: ${institution || 'Non specifiee'}
TYPE D'INCIDENT: ${incidentType || 'Non specifie'}

Retourne un JSON structure conforme au schema DeepAnalysisResult.`;

    const userPrompt = `ANALYSE APPROFONDIE REQUISE

FAITS CONSTATES:
${faits || 'Non fournis'}

DYSFONCTIONNEMENT SIGNALE:
${dysfonctionnement || 'Non specifie'}

CORRESPONDANCE EMAIL (${(emails || []).length} messages):
${emailContext || 'Aucun email fourni'}

INSTRUCTIONS:
1. Lis attentivement chaque email
2. Extrait les citations exactes pertinentes (avec [EMAIL X, Date])
3. Identifie la chaine causale des evenements
4. Detecte les excuses vs obligations legales
5. Releve les contradictions comportementales
6. Analyse les delais (calcul precis en jours)
7. Etablis les responsabilites avec score de severite (1-10)
8. Produis une synthese avec cause racine et actions recommandees

ATTENTION: Ne cite JAMAIS un article de loi dont tu n'es pas certain de l'existence.`;

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
            description: 'Retourne une analyse approfondie structuree de l\'incident avec citations exactes',
            parameters: {
              type: 'object',
              properties: {
                causal_chain: {
                  type: 'array',
                  description: 'Chaine causale des evenements avec citations verbatim',
                  items: {
                    type: 'object',
                    properties: {
                      cause: { type: 'string', description: 'Cause identifiee' },
                      citation: { type: 'string', description: 'Citation EXACTE de l\'email avec [EMAIL X, Date]' },
                      consequence: { type: 'string', description: 'Consequence directe' },
                      impact: { type: 'string', description: 'Impact sur la personne concernee' },
                      date: { type: 'string', description: 'Date de l\'evenement si connue' }
                    },
                    required: ['cause', 'citation', 'consequence', 'impact']
                  }
                },
                excuses_detected: {
                  type: 'array',
                  description: 'Excuses avancees vs obligations legales',
                  items: {
                    type: 'object',
                    properties: {
                      actor: { type: 'string', description: 'Nom/role de l\'acteur' },
                      excuse: { type: 'string', description: 'Excuse avancee' },
                      citation: { type: 'string', description: 'Citation exacte de l\'excuse' },
                      legal_obligation: { type: 'string', description: 'Obligation legale correspondante' },
                      legal_article: { type: 'string', description: 'Article de loi precis (ex: Art. 389 al. 2 CC) ou "Base legale a verifier"' },
                      is_valid: { type: 'boolean', description: 'L\'excuse est-elle juridiquement valable?' },
                      counter_argument: { type: 'string', description: 'Contre-argument juridique' }
                    },
                    required: ['actor', 'excuse', 'legal_obligation', 'is_valid', 'counter_argument']
                  }
                },
                behavioral_contradictions: {
                  type: 'array',
                  description: 'Contradictions dans le comportement des acteurs',
                  items: {
                    type: 'object',
                    properties: {
                      actor: { type: 'string' },
                      action_1: { type: 'string', description: 'Premiere action/declaration' },
                      action_1_date: { type: 'string' },
                      action_2: { type: 'string', description: 'Action/declaration contradictoire' },
                      action_2_date: { type: 'string' },
                      contradiction: { type: 'string', description: 'Explication de la contradiction' },
                      severity: { type: 'string', enum: ['minor', 'moderate', 'major'] }
                    },
                    required: ['actor', 'action_1', 'action_2', 'contradiction', 'severity']
                  }
                },
                deadline_analysis: {
                  type: 'array',
                  description: 'Analyse des delais avec calculs precis',
                  items: {
                    type: 'object',
                    properties: {
                      event: { type: 'string', description: 'Evenement declencheur' },
                      event_date: { type: 'string', description: 'Date de l\'evenement (format ISO ou texte)' },
                      deadline_date: { type: 'string', description: 'Date limite calculee' },
                      legal_deadline_days: { type: 'number', description: 'Delai legal en jours' },
                      remaining_days: { type: 'number', description: 'Jours restants (negatif si depasse)' },
                      impact: { type: 'string', description: 'Impact du depassement eventuel' },
                      citation: { type: 'string', description: 'Citation source' },
                      legal_basis: { type: 'string', description: 'Base legale du delai (Art. X Loi)' }
                    },
                    required: ['event', 'impact', 'legal_basis']
                  }
                },
                cascade_failures: {
                  type: 'array',
                  description: 'Defaillances en cascade',
                  items: {
                    type: 'object',
                    properties: {
                      step: { type: 'number', description: 'Numero d\'etape (1, 2, 3...)' },
                      failure: { type: 'string', description: 'Description de la defaillance' },
                      date: { type: 'string' },
                      leads_to: { type: 'string', description: 'Consequence directe menant a l\'etape suivante' },
                      responsibility: { type: 'string', description: 'Acteur responsable' }
                    },
                    required: ['step', 'failure', 'leads_to', 'responsibility']
                  }
                },
                responsibilities: {
                  type: 'array',
                  description: 'Attribution des responsabilites avec scores',
                  items: {
                    type: 'object',
                    properties: {
                      actor: { type: 'string', description: 'Nom ou role de l\'acteur' },
                      role: { type: 'string', description: 'Fonction institutionnelle' },
                      failures: { type: 'array', items: { type: 'string' }, description: 'Liste des manquements' },
                      legal_violations: { type: 'array', items: { type: 'string' }, description: 'Articles de loi violes (format: Art. X Loi)' },
                      mitigating_factors: { type: 'array', items: { type: 'string' }, description: 'Facteurs attenuants' },
                      severity_score: { type: 'number', description: 'Score de severite de 1 (mineur) a 10 (tres grave)' }
                    },
                    required: ['actor', 'role', 'failures', 'severity_score']
                  }
                },
                synthesis: {
                  type: 'object',
                  description: 'Synthese globale de l\'analyse',
                  properties: {
                    main_dysfunction: { type: 'string', description: 'Dysfonctionnement principal identifie' },
                    root_cause: { type: 'string', description: 'Cause racine du probleme' },
                    aggravating_factors: { type: 'array', items: { type: 'string' }, description: 'Facteurs aggravants' },
                    rights_violated: { type: 'array', items: { type: 'string' }, description: 'Droits fondamentaux violes (avec base legale)' },
                    recommended_actions: { type: 'array', items: { type: 'string' }, description: 'Actions recommandees (concretes et realisables)' },
                    severity_assessment: { type: 'string', description: 'Evaluation globale de la gravite avec justification' }
                  },
                  required: ['main_dysfunction', 'root_cause', 'severity_assessment']
                }
              },
              required: ['causal_chain', 'synthesis'],
              additionalProperties: false
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

    // Validate that citations are present
    const hasCitations = analysis.causal_chain?.some(c => c.citation && c.citation.length > 10);
    
    return new Response(JSON.stringify({ 
      success: true, 
      analysis,
      metadata: {
        emailsAnalyzed: (emails || []).length,
        hasCitations,
        model: 'google/gemini-2.5-flash'
      }
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
