import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Email {
  id: string;
  sender: string;
  recipient?: string;
  subject: string;
  body: string;
  received_at: string;
  is_sent?: boolean;
}

interface DeepAnalysisRequest {
  emails: Email[];
  faits: string;
  dysfonctionnement: string;
  incidentType: string;
  institution: string;
}

interface CausalLink {
  cause: string;
  citation: string;
  consequence: string;
  impact: string;
  date?: string;
}

interface ExcuseAnalysis {
  actor: string;
  excuse: string;
  citation: string;
  legal_obligation: string;
  legal_article: string;
  is_valid: boolean;
  counter_argument: string;
}

interface BehavioralContradiction {
  actor: string;
  action_1: string;
  action_1_date?: string;
  action_2: string;
  action_2_date?: string;
  contradiction: string;
  severity: 'minor' | 'moderate' | 'major';
}

interface DeadlineAnalysis {
  event: string;
  event_date?: string;
  discovery_date?: string;
  deadline_date?: string;
  legal_deadline_days?: number;
  remaining_days?: number;
  impact: string;
  citation: string;
  legal_basis: string;
}

interface ProfessionalResponse {
  actor: string;
  role: string;
  response_type: string;
  context: string;
  constraints: string;
  quality_assessment: string;
  citation: string;
}

interface CascadeFailure {
  step: number;
  failure: string;
  date?: string;
  leads_to: string;
  responsibility: string;
}

interface ResponsibilityAssessment {
  actor: string;
  role: string;
  failures: string[];
  legal_violations: string[];
  mitigating_factors: string[];
  severity_score: number;
}

interface DeepAnalysisResult {
  causal_chain: CausalLink[];
  excuses_detected: ExcuseAnalysis[];
  behavioral_contradictions: BehavioralContradiction[];
  deadline_analysis: DeadlineAnalysis[];
  professional_responses: ProfessionalResponse[];
  cascade_failures: CascadeFailure[];
  responsibilities: ResponsibilityAssessment[];
  synthesis: {
    main_dysfunction: string;
    root_cause: string;
    aggravating_factors: string[];
    rights_violated: string[];
    recommended_actions: string[];
    severity_assessment: string;
  };
}

const ANALYSIS_PROMPT = `Tu es un expert juridique suisse spécialisé dans la protection de l'adulte (Art. 388-456 CC).
Analyse cette correspondance email en profondeur pour détecter les dysfonctionnements, excuses, contradictions et violations de droits.

FOCUS D'ANALYSE CRITIQUE:

1. CHAÎNE DE CAUSALITÉ
- Identifie chaque cause et ses conséquences en cascade
- Extrait les citations exactes prouvant chaque lien causal
- Évalue l'impact sur les droits de la personne protégée

2. EXCUSES ET JUSTIFICATIONS
- Détecte: vacances, maladie, surcharge, "j'ai pas pu", "c'était impossible"
- Confronte chaque excuse avec l'obligation légale correspondante
- Évalue si l'excuse est valable juridiquement

3. CONTRADICTIONS COMPORTEMENTALES
- Promesse vs action réelle
- Engagement oral vs résultat
- Déclaration d'intention vs inaction

4. DÉLAIS CRITIQUES
- Calcule précisément les jours entre événements
- Compare avec les délais légaux (30j recours Art. 450 CC, etc.)
- Évalue l'impact du non-respect des délais

5. RÉPONSES PROFESSIONNELLES
- Analyse la qualité des réponses de chaque professionnel
- Détecte les réponses évasives, tardives, incomplètes
- Évalue le respect des obligations professionnelles

6. RESPONSABILITÉS
- Identifie clairement QUI a failli et POURQUOI
- Liste les articles de loi violés par chaque acteur
- Évalue la gravité de chaque manquement

ARTICLES DE LOI À CONSIDÉRER:
- Art. 388-389 CC: But de la protection de l'adulte
- Art. 404 CC: Obligation de diligence du curateur
- Art. 406 CC: Accomplissement des tâches dans les délais
- Art. 413-414 CC: Gestion du patrimoine
- Art. 450 CC: Droit de recours (30 jours)
- Art. 29 Cst.: Garanties de procédure
- Art. 35 PA: Motivation des décisions

Réponds UNIQUEMENT avec un JSON valide suivant cette structure exacte:
{
  "causal_chain": [
    {
      "cause": "Description de la cause",
      "citation": "Citation exacte du mail entre guillemets",
      "consequence": "Conséquence directe",
      "impact": "Impact sur les droits",
      "date": "Date si mentionnée"
    }
  ],
  "excuses_detected": [
    {
      "actor": "Nom ou rôle de la personne",
      "excuse": "Type d'excuse (vacances, maladie, etc.)",
      "citation": "Citation exacte",
      "legal_obligation": "L'obligation légale non respectée",
      "legal_article": "Art. XXX CC",
      "is_valid": false,
      "counter_argument": "Pourquoi cette excuse n'est pas valable"
    }
  ],
  "behavioral_contradictions": [
    {
      "actor": "Nom ou rôle",
      "action_1": "Ce qui a été dit/promis",
      "action_1_date": "Date",
      "action_2": "Ce qui a été fait en réalité",
      "action_2_date": "Date",
      "contradiction": "Explication de la contradiction",
      "severity": "minor|moderate|major"
    }
  ],
  "deadline_analysis": [
    {
      "event": "Événement déclencheur",
      "event_date": "Date de l'événement",
      "discovery_date": "Date de découverte",
      "deadline_date": "Date limite légale",
      "legal_deadline_days": 30,
      "remaining_days": 5,
      "impact": "Impact du délai court",
      "citation": "Citation du mail",
      "legal_basis": "Art. 450 CC"
    }
  ],
  "professional_responses": [
    {
      "actor": "Nom du professionnel",
      "role": "Rôle (psychiatre, curateur, etc.)",
      "response_type": "Type de réponse",
      "context": "Contexte de la demande",
      "constraints": "Contraintes subies",
      "quality_assessment": "Évaluation de la réponse",
      "citation": "Citation"
    }
  ],
  "cascade_failures": [
    {
      "step": 1,
      "failure": "Description du dysfonctionnement",
      "date": "Date",
      "leads_to": "Ce que ça entraîne",
      "responsibility": "Qui est responsable"
    }
  ],
  "responsibilities": [
    {
      "actor": "Nom/rôle",
      "role": "Fonction officielle",
      "failures": ["Manquement 1", "Manquement 2"],
      "legal_violations": ["Art. 404 CC", "Art. 406 CC"],
      "mitigating_factors": ["Facteur atténuant si applicable"],
      "severity_score": 8
    }
  ],
  "synthesis": {
    "main_dysfunction": "Le problème principal identifié",
    "root_cause": "La cause racine",
    "aggravating_factors": ["Facteur 1", "Facteur 2"],
    "rights_violated": ["Droit au recours", "Droit à l'information"],
    "recommended_actions": ["Action 1", "Action 2"],
    "severity_assessment": "Évaluation globale de la gravité"
  }
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emails, faits, dysfonctionnement, incidentType, institution } = await req.json() as DeepAnalysisRequest;

    if (!emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Aucun email fourni' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build email context
    const emailContext = emails
      .sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime())
      .map((email, idx) => {
        const date = new Date(email.received_at).toLocaleDateString('fr-CH');
        const direction = email.is_sent ? '→ ENVOYÉ' : '← REÇU';
        return `
=== EMAIL ${idx + 1} (${date}) ${direction} ===
De: ${email.sender}
À: ${email.recipient || 'N/A'}
Objet: ${email.subject}

${email.body}
`;
      })
      .join('\n---\n');

    const userPrompt = `CONTEXTE DE L'INCIDENT:
Type: ${incidentType}
Institution: ${institution}

FAITS DÉCLARÉS:
${faits}

DYSFONCTIONNEMENT IDENTIFIÉ:
${dysfonctionnement}

CORRESPONDANCE EMAIL À ANALYSER (${emails.length} emails):
${emailContext}

Analyse ces emails en profondeur et identifie tous les éléments demandés.`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling Lovable AI for deep analysis...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: ANALYSIS_PROMPT },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    console.log('AI response received, parsing...');

    // Parse JSON from response
    let analysis: DeepAnalysisResult;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.log('Raw content:', content.substring(0, 500));
      
      // Return empty structure on parse failure
      analysis = {
        causal_chain: [],
        excuses_detected: [],
        behavioral_contradictions: [],
        deadline_analysis: [],
        professional_responses: [],
        cascade_failures: [],
        responsibilities: [],
        synthesis: {
          main_dysfunction: dysfonctionnement || 'Non déterminé',
          root_cause: 'Analyse incomplète',
          aggravating_factors: [],
          rights_violated: [],
          recommended_actions: ['Réanalyser manuellement les emails'],
          severity_assessment: 'Non évaluable'
        }
      };
    }

    console.log('Deep analysis complete:', {
      causal_links: analysis.causal_chain?.length || 0,
      excuses: analysis.excuses_detected?.length || 0,
      contradictions: analysis.behavioral_contradictions?.length || 0,
      deadlines: analysis.deadline_analysis?.length || 0,
      cascade_steps: analysis.cascade_failures?.length || 0,
    });

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Deep analysis error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
