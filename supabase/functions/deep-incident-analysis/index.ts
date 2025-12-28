import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface IncidentElement {
  type: string;
  description: string;
  date?: string;
  actor?: string;
  citation: string;
  legal_basis: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface TimelineEvent {
  date: string;
  event: string;
  actor: string;
  type: 'request' | 'response' | 'deadline' | 'decision' | 'escalation' | 'break';
  legal_implications: string[];
}

interface CausalLink {
  cause: string;
  citation: string;
  consequence: string;
  impact: string;
  date?: string;
  legal_basis: string[];
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
  legal_basis: string[];
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
  incident_elements: IncidentElement[];
  timeline: TimelineEvent[];
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
    total_elements_detected: number;
  };
}

interface DetectionPattern {
  id: string;
  category: string;
  pattern_name: string;
  keywords: string[];
  legal_articles: string[];
  severity: string;
  counter_arguments: string[];
}

// Build dynamic prompt based on detection patterns
function buildDynamicAnalysisPrompt(patterns: DetectionPattern[]): string {
  const patternInstructions = patterns.map(p => 
    `- ${p.category.toUpperCase()} "${p.pattern_name}": Mots-clés [${p.keywords?.join(', ') || 'N/A'}], Articles [${p.legal_articles?.join(', ') || 'N/A'}]`
  ).join('\n');

  return `Tu es un expert juridique suisse ultra-rigoureux spécialisé dans la protection de l'adulte (Art. 388-456 CC).

MISSION CRITIQUE:
Analyse cette correspondance email de manière EXHAUSTIVE pour identifier TOUS les éléments d'incident dans ce thread.
Tu dois être précis comme une montre suisse - ne rate AUCUN élément, AUCUNE violation, AUCUNE base légale pertinente.

CONTRAINTES ABSOLUES:
1. Chaque affirmation DOIT avoir une CITATION EXACTE du mail entre guillemets
2. Chaque base légale citée DOIT être pertinente et spécifique au fait détecté
3. NE JAMAIS inventer de bases légales - utilise UNIQUEMENT celles du référentiel suisse
4. TOUS les éléments du thread doivent être analysés, pas seulement les principaux

PATTERNS À DÉTECTER (enrichis par l'entraînement):
${patternInstructions || 'Aucun pattern personnalisé - utiliser les détections standards'}

ÉLÉMENTS À IDENTIFIER (EXHAUSTIVEMENT):
1. DEMANDES INITIALES - Toute requête de la personne concernée
2. DÉLAIS/ÉCHÉANCES - Dates mentionnées, délais légaux applicables
3. RÉPONSES/NON-RÉPONSES - Chaque réponse ou absence de réponse
4. EXCUSES/JUSTIFICATIONS - Vacances, maladie, surcharge, "pas possible"
5. PROMESSES NON TENUES - Engagements vs résultats
6. DÉCISIONS NON MOTIVÉES - Refus sans explication légale
7. RENVOIS DE RESPONSABILITÉ - "Ce n'est pas mon rôle", "Contactez X"
8. RUPTURES DE DISCUSSION - Changements de sujet, questions ignorées
9. INTIMIDATION/CONDESCENDANCE - Ton inapproprié
10. CONTRADICTIONS - Dit vs fait, promesse vs réalité
11. VIOLATIONS DE CONFIDENTIALITÉ - Partage non autorisé d'informations

BASES LÉGALES SUISSES À APPLIQUER:
Protection de l'adulte (CC):
- Art. 388-389: But, subsidiarité, proportionnalité
- Art. 390-395: Types de curatelle
- Art. 400-406: Obligations du curateur (surtout 404, 405, 406)
- Art. 408-414: Gestion patrimoniale, rapports
- Art. 420-422: Responsabilité, actes interdits
- Art. 426-439: PAFA
- Art. 446-450: Procédure, recours (30j art. 450b)

Constitution (Cst):
- Art. 10: Droit à la vie, liberté personnelle
- Art. 13: Protection vie privée
- Art. 29: Garanties de procédure
- Art. 31: Privation de liberté

Procédure administrative (PA):
- Art. 26: Droit d'être entendu
- Art. 29: Constatation des faits
- Art. 35: Motivation des décisions

Protection des données (LPD):
- Art. 6-7: Principes, sécurité
- Art. 13: Discrétion
- Art. 25: Droit d'accès

STRUCTURE DE RÉPONSE JSON (OBLIGATOIRE):
{
  "incident_elements": [
    {
      "type": "demande_initiale|delai|non_reponse|excuse|promesse_non_tenue|decision_non_motivee|renvoi_responsabilite|rupture|intimidation|contradiction|violation_confidentialite",
      "description": "Description précise",
      "date": "Date si connue",
      "actor": "Personne/institution concernée",
      "citation": "Citation EXACTE du mail",
      "legal_basis": ["Art. XXX CC", "Art. YY Cst"],
      "severity": "low|medium|high|critical"
    }
  ],
  "timeline": [
    {
      "date": "YYYY-MM-DD",
      "event": "Description de l'événement",
      "actor": "Qui",
      "type": "request|response|deadline|decision|escalation|break",
      "legal_implications": ["Art. XXX CC"]
    }
  ],
  "causal_chain": [
    {
      "cause": "Description",
      "citation": "Citation exacte",
      "consequence": "Conséquence directe",
      "impact": "Impact sur les droits",
      "date": "Date",
      "legal_basis": ["Art. XXX CC"]
    }
  ],
  "excuses_detected": [
    {
      "actor": "Nom/rôle",
      "excuse": "Type (vacances, maladie, surcharge, pas mon rôle)",
      "citation": "Citation exacte",
      "legal_obligation": "Obligation légale non respectée",
      "legal_article": "Art. XXX CC",
      "is_valid": false,
      "counter_argument": "Pourquoi invalide juridiquement"
    }
  ],
  "behavioral_contradictions": [
    {
      "actor": "Nom/rôle",
      "action_1": "Ce qui a été dit/promis",
      "action_1_date": "Date",
      "action_2": "Ce qui a été fait",
      "action_2_date": "Date",
      "contradiction": "Explication",
      "severity": "minor|moderate|major"
    }
  ],
  "deadline_analysis": [
    {
      "event": "Événement déclencheur",
      "event_date": "Date",
      "discovery_date": "Date découverte",
      "deadline_date": "Échéance légale",
      "legal_deadline_days": 30,
      "remaining_days": 5,
      "impact": "Impact du délai",
      "citation": "Citation",
      "legal_basis": "Art. 450b CC"
    }
  ],
  "professional_responses": [
    {
      "actor": "Nom",
      "role": "Fonction",
      "response_type": "Type de réponse",
      "context": "Contexte",
      "constraints": "Contraintes invoquées",
      "quality_assessment": "Évaluation qualité",
      "citation": "Citation"
    }
  ],
  "cascade_failures": [
    {
      "step": 1,
      "failure": "Dysfonctionnement",
      "date": "Date",
      "leads_to": "Entraîne",
      "responsibility": "Responsable",
      "legal_basis": ["Art. XXX CC"]
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
    "main_dysfunction": "Problème principal",
    "root_cause": "Cause racine",
    "aggravating_factors": ["Facteur 1", "Facteur 2"],
    "rights_violated": ["Droit 1", "Droit 2"],
    "recommended_actions": ["Action 1", "Action 2"],
    "severity_assessment": "Évaluation globale",
    "total_elements_detected": 12
  }
}`;
}

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

    // Fetch detection patterns from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: patterns } = await supabase
      .from('detection_patterns')
      .select('id, category, pattern_name, keywords, legal_articles, severity, counter_arguments')
      .eq('is_active', true);

    console.log(`Loaded ${patterns?.length || 0} detection patterns`);

    // Build dynamic prompt with patterns
    const analysisPrompt = buildDynamicAnalysisPrompt(patterns || []);

    // Build email context with clear structure
    const emailContext = emails
      .sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime())
      .map((email, idx) => {
        const date = new Date(email.received_at).toLocaleDateString('fr-CH');
        const time = new Date(email.received_at).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
        const direction = email.is_sent ? '→ ENVOYÉ' : '← REÇU';
        
        // Clean email body for analysis
        const cleanBody = email.body
          .replace(/[\r\n]{3,}/g, '\n\n')
          .replace(/^>.*$/gm, '[citation précédente]')
          .substring(0, 3000);

        return `
══════════════════════════════════════════
EMAIL ${idx + 1}/${emails.length} | ${date} ${time} | ${direction}
══════════════════════════════════════════
DE: ${email.sender}
À: ${email.recipient || 'N/A'}
OBJET: ${email.subject}
──────────────────────────────────────────
${cleanBody}
`;
      })
      .join('\n');

    const userPrompt = `INCIDENT À ANALYSER EN PROFONDEUR:

TYPE: ${incidentType}
INSTITUTION: ${institution}
NOMBRE D'EMAILS: ${emails.length}
PÉRIODE: ${emails.length > 0 ? 
  `${new Date(emails[0].received_at).toLocaleDateString('fr-CH')} - ${new Date(emails[emails.length-1].received_at).toLocaleDateString('fr-CH')}` 
  : 'N/A'}

═══════════════════════════════════════════
FAITS DÉCLARÉS PAR LA PERSONNE CONCERNÉE:
═══════════════════════════════════════════
${faits}

═══════════════════════════════════════════
DYSFONCTIONNEMENT IDENTIFIÉ:
═══════════════════════════════════════════
${dysfonctionnement}

═══════════════════════════════════════════
CORRESPONDANCE EMAIL COMPLÈTE À ANALYSER:
═══════════════════════════════════════════
${emailContext}

═══════════════════════════════════════════
INSTRUCTIONS FINALES:
═══════════════════════════════════════════
1. Analyse CHAQUE email individuellement
2. Identifie TOUS les éléments d'incident (minimum attendu: ${Math.max(3, Math.floor(emails.length / 2))})
3. Construis une timeline COMPLÈTE
4. Cite UNIQUEMENT des passages qui existent RÉELLEMENT dans les emails
5. N'invente AUCUNE base légale - utilise le référentiel suisse fourni
6. Retourne UNIQUEMENT le JSON, sans commentaires ni explications`;

    // Call Lovable AI with gemini-2.5-pro for complex analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Calling Lovable AI for deep analysis of ${emails.length} emails...`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: analysisPrompt },
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

    console.log('AI response received, parsing JSON...');

    // Parse JSON from response
    let analysis: DeepAnalysisResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      analysis = JSON.parse(jsonStr);
      
      // Validate structure
      if (!analysis.incident_elements) analysis.incident_elements = [];
      if (!analysis.timeline) analysis.timeline = [];
      if (!analysis.causal_chain) analysis.causal_chain = [];
      if (!analysis.excuses_detected) analysis.excuses_detected = [];
      if (!analysis.behavioral_contradictions) analysis.behavioral_contradictions = [];
      if (!analysis.deadline_analysis) analysis.deadline_analysis = [];
      if (!analysis.professional_responses) analysis.professional_responses = [];
      if (!analysis.cascade_failures) analysis.cascade_failures = [];
      if (!analysis.responsibilities) analysis.responsibilities = [];
      if (!analysis.synthesis) {
        analysis.synthesis = {
          main_dysfunction: dysfonctionnement || 'Non déterminé',
          root_cause: 'Analyse requise',
          aggravating_factors: [],
          rights_violated: [],
          recommended_actions: [],
          severity_assessment: 'En cours d\'évaluation',
          total_elements_detected: 0,
        };
      }
      
      // Calculate total elements
      analysis.synthesis.total_elements_detected = 
        analysis.incident_elements.length +
        analysis.excuses_detected.length +
        analysis.behavioral_contradictions.length +
        analysis.cascade_failures.length;

    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.log('Raw content (first 1000 chars):', content.substring(0, 1000));
      
      // Return minimal structure on parse failure
      analysis = {
        incident_elements: [],
        timeline: [],
        causal_chain: [],
        excuses_detected: [],
        behavioral_contradictions: [],
        deadline_analysis: [],
        professional_responses: [],
        cascade_failures: [],
        responsibilities: [],
        synthesis: {
          main_dysfunction: dysfonctionnement || 'Non déterminé',
          root_cause: 'Analyse impossible - erreur de parsing',
          aggravating_factors: [],
          rights_violated: [],
          recommended_actions: ['Réanalyser manuellement les emails'],
          severity_assessment: 'Non évaluable',
          total_elements_detected: 0,
        }
      };
    }

    console.log('Deep analysis complete:', {
      incident_elements: analysis.incident_elements?.length || 0,
      timeline_events: analysis.timeline?.length || 0,
      causal_links: analysis.causal_chain?.length || 0,
      excuses: analysis.excuses_detected?.length || 0,
      contradictions: analysis.behavioral_contradictions?.length || 0,
      deadlines: analysis.deadline_analysis?.length || 0,
      cascade_steps: analysis.cascade_failures?.length || 0,
      responsibilities: analysis.responsibilities?.length || 0,
      total_detected: analysis.synthesis?.total_elements_detected || 0,
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
