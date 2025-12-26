import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Prompt ultra-spécialisé pour la détection de trahisons et comportements déloyaux
const BETRAYAL_DETECTION_PROMPT = `Tu es un enquêteur juridique spécialisé dans la détection de comportements déloyaux, trahisons et conflits d'intérêts dans les correspondances institutionnelles suisses.

🔒 RÈGLES ABSOLUES - VIOLATION = ÉCHEC DE L'ANALYSE 🔒

1. **CITATION OU SILENCE**
   - Chaque accusation de comportement déloyal DOIT être accompagnée de citations EXACTES
   - Format obligatoire: "[Citation exacte entre guillemets]" (Email du JJ/MM/AAAA de Expéditeur)
   - Si pas de citation prouvant le comportement → NE PAS ACCUSER

2. **TYPES DE COMPORTEMENTS DÉLOYAUX À DÉTECTER**

   A. COMMUNICATIONS CACHÉES (hidden_communication)
   - Emails en CC/BCC vers des tiers sans informer la personne concernée
   - Références à des conversations téléphoniques ou réunions dont le pupille est exclu
   - "Comme convenu au téléphone...", "Suite à notre entretien...", "Comme discuté entre nous..."
   - Transferts d'emails sans l'informer
   
   B. CONTRADICTIONS (contradiction)
   - Affirmations différentes dans des emails différents sur le même sujet
   - Promesses non tenues avec dates précises
   - Changements de position injustifiés
   - Compare CHAQUE affirmation d'un acteur avec ses affirmations précédentes
   
   C. CONFLITS D'INTÉRÊTS (conflict_of_interest)
   - Décisions prises sans consultation du pupille
   - Actions qui profitent visiblement à d'autres parties
   - Relations suspectes entre le curateur et d'autres acteurs
   - Lenteur injustifiée sur des sujets urgents
   
   D. MANIPULATION (manipulation)
   - Reformulation déformante des propos du pupille
   - Attribution de propos jamais tenus
   - Mise en cause injustifiée du pupille
   - Culpabilisation du pupille pour des fautes d'autrui
   - Minimisation de problèmes graves
   
   E. PROMESSES NON TENUES (broken_promise)
   - "Je vous recontacte cette semaine" → pas de contact
   - Délais annoncés non respectés
   - Engagements non suivis d'effet
   
   F. OMISSIONS VOLONTAIRES (omission)
   - Informations importantes non transmises
   - Documents cachés ou retenus
   - Décisions prises sans information préalable

3. **SCORE DE LOYAUTÉ (0-100)**
   - 100 = Aucun comportement suspect, pleine collaboration
   - 80-99 = Quelques erreurs mineures, globalement fiable
   - 50-79 = Comportements ambigus nécessitant vigilance
   - 20-49 = Comportements déloyaux multiples avérés
   - 0-19 = Trahison caractérisée avec preuves multiples

4. **NIVEAUX DE CERTITUDE**
   - CERTAIN = Citations directes prouvant explicitement le comportement
   - PROBABLE = Faisceau d'indices convergents (minimum 3 citations)
   - POSSIBLE = Interprétation basée sur une citation, À VÉRIFIER

5. **BASES LÉGALES SUISSES PERTINENTES**
   - Art. 398 CC: Devoir de diligence du curateur
   - Art. 404 CC: Obligation de collaboration avec la personne concernée
   - Art. 406 CC: Obligation d'information et de rapport
   - Art. 413 CC: Conditions de révocation du curateur
   - Art. 417 CC: Interdiction des conflits d'intérêts
   - Art. 419-420 CC: Responsabilité du curateur et de l'État

FORMAT JSON OBLIGATOIRE:
{
  "analysis_date": "YYYY-MM-DD",
  "thread_id": "ID du thread analysé",
  "actors_analyzed": [
    {
      "name": "Nom tel qu'apparaissant dans les emails",
      "email": "email@domain.ch",
      "role": "Rôle officiel (curateur, juge, assistant social, etc.)",
      "institution": "Institution représentée",
      "loyalty_score": 85,
      "loyalty_assessment": "fiable/vigilance_requise/comportement_suspect/trahison_avérée",
      "suspicious_behaviors": [
        {
          "type": "hidden_communication/contradiction/conflict_of_interest/manipulation/broken_promise/omission",
          "description": "Description factuelle du comportement",
          "severity": "critique/haute/moyenne",
          "confidence": "CERTAIN/PROBABLE/POSSIBLE",
          "evidence": [
            {
              "citation": "Citation EXACTE prouvant le comportement",
              "source": "Email du JJ/MM/AAAA de Expéditeur",
              "email_id": "ID de l'email si disponible"
            }
          ],
          "counter_evidence": [
            {
              "citation": "Citation qui pourrait atténuer ou contredire",
              "source": "Email du JJ/MM/AAAA de Expéditeur"
            }
          ],
          "legal_violation": "Article de loi violé si applicable",
          "recommended_action": "Action recommandée (signalement, demande d'explication, procédure formelle)"
        }
      ],
      "positive_behaviors": [
        {
          "description": "Action positive de cet acteur",
          "citation": "Citation prouvant ce comportement positif",
          "source": "Email du JJ/MM/AAAA"
        }
      ]
    }
  ],
  "hidden_communications_detected": [
    {
      "description": "Description de la communication cachée",
      "actors_involved": ["Nom1", "Nom2"],
      "evidence": "Citation prouvant l'exclusion du pupille",
      "source": "Email du JJ/MM/AAAA"
    }
  ],
  "contradictions_matrix": [
    {
      "actor": "Nom de l'acteur",
      "statement_1": {
        "content": "Première affirmation",
        "date": "JJ/MM/AAAA",
        "source": "Email du JJ/MM/AAAA"
      },
      "statement_2": {
        "content": "Affirmation contradictoire",
        "date": "JJ/MM/AAAA",
        "source": "Email du JJ/MM/AAAA"
      },
      "analysis": "Explication de la contradiction"
    }
  ],
  "trust_network": {
    "reliable_actors": ["Liste des acteurs fiables avec score > 80"],
    "suspicious_actors": ["Liste des acteurs suspects avec score < 50"],
    "relationships": [
      {
        "actors": ["Acteur1", "Acteur2"],
        "relationship_type": "alliance/opposition/neutre",
        "evidence": "Indice de cette relation"
      }
    ]
  },
  "summary": {
    "total_actors": 0,
    "critical_issues": 0,
    "main_concerns": ["Liste des préoccupations principales"],
    "recommended_priority_actions": ["Actions prioritaires recommandées"]
  }
}`;

interface Email {
  id: string;
  sender: string;
  recipient: string | null;
  subject: string;
  body: string;
  received_at: string;
  gmail_thread_id: string | null;
}

interface BetrayalAnalysis {
  analysis_date: string;
  thread_id: string;
  actors_analyzed: any[];
  hidden_communications_detected: any[];
  contradictions_matrix: any[];
  trust_network: any;
  summary: any;
}

async function detectBetrayalPatterns(emails: Email[]): Promise<BetrayalAnalysis | null> {
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured');
    return null;
  }

  // Sort emails chronologically
  const sortedEmails = [...emails].sort((a, b) => 
    new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
  );

  // Build the thread content with emphasis on detecting patterns
  const threadContent = sortedEmails.map((email, index) => {
    const date = new Date(email.received_at).toLocaleDateString('fr-CH');
    return `
=== EMAIL ${index + 1} [ID: ${email.id}] ===
Date: ${date}
De: ${email.sender}
À: ${email.recipient || 'Non spécifié'}
Objet: ${email.subject}
---
${email.body}
===`;
  }).join('\n\n');

  const userPrompt = `Analyse ce fil de discussion email pour détecter TOUS les comportements déloyaux, trahisons et incohérences.

IMPORTANT: 
- Compare systématiquement les affirmations de chaque acteur entre les différents emails
- Recherche les indices de communications cachées (références à des conversations non documentées)
- Identifie les promesses non tenues
- Détecte les reformulations déformantes

THREAD À ANALYSER (${sortedEmails.length} emails):
${threadContent}

Réponds UNIQUEMENT en JSON valide selon le format spécifié. Chaque accusation DOIT avoir au moins une citation exacte.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: BETRAYAL_DETECTION_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return null;
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', content);
      return null;
    }

    return JSON.parse(jsonMatch[0]) as BetrayalAnalysis;
  } catch (error) {
    console.error('Betrayal detection error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { threadId, batchSize = 5, updateTrustScores = true } = await req.json().catch(() => ({}));

    console.log('Starting betrayal pattern detection...');

    let threadsToAnalyze: string[] = [];

    if (threadId) {
      threadsToAnalyze = [threadId];
    } else {
      // Get threads that haven't been analyzed for betrayal yet
      const { data: existingDetections } = await supabase
        .from('betrayal_detections')
        .select('thread_id');
      
      const analyzedThreads = new Set(existingDetections?.map(d => d.thread_id) || []);

      // Get unique thread IDs from emails with content
      const { data: emails } = await supabase
        .from('emails')
        .select('gmail_thread_id')
        .not('gmail_thread_id', 'is', null)
        .not('body', 'is', null)
        .not('body', 'eq', '');

      const uniqueThreads = [...new Set(emails?.map(e => e.gmail_thread_id).filter(Boolean) || [])];
      threadsToAnalyze = uniqueThreads.filter(t => !analyzedThreads.has(t!)).slice(0, batchSize) as string[];
    }

    console.log(`Analyzing ${threadsToAnalyze.length} threads for betrayal patterns`);

    const results = {
      analyzed: 0,
      betrayals_detected: 0,
      actors_flagged: 0,
      errors: [] as string[],
    };

    for (const currentThreadId of threadsToAnalyze) {
      try {
        // Get all emails in this thread
        const { data: threadEmails, error: emailsError } = await supabase
          .from('emails')
          .select('id, sender, recipient, subject, body, received_at, gmail_thread_id')
          .eq('gmail_thread_id', currentThreadId)
          .not('body', 'is', null)
          .not('body', 'eq', '')
          .order('received_at', { ascending: true });

        if (emailsError || !threadEmails || threadEmails.length === 0) {
          console.log(`No emails found for thread ${currentThreadId}`);
          continue;
        }

        console.log(`Analyzing thread ${currentThreadId} with ${threadEmails.length} emails for betrayal`);

        const analysis = await detectBetrayalPatterns(threadEmails);

        if (!analysis) {
          results.errors.push(`Failed to analyze thread ${currentThreadId}`);
          continue;
        }

        results.analyzed++;

        // Store detected betrayals
        for (const actor of analysis.actors_analyzed || []) {
          for (const behavior of actor.suspicious_behaviors || []) {
            if (behavior.confidence !== 'POSSIBLE' || behavior.severity === 'critique') {
              const { error: insertError } = await supabase
                .from('betrayal_detections')
                .insert({
                  thread_id: currentThreadId,
                  actor_name: actor.name,
                  betrayal_type: behavior.type,
                  severity: behavior.severity,
                  confidence: behavior.confidence,
                  evidence: behavior.evidence,
                  counter_evidence: behavior.counter_evidence,
                  citations: behavior.evidence,
                });

              if (!insertError) {
                results.betrayals_detected++;
              } else {
                console.error('Error storing betrayal:', insertError);
              }
            }
          }

          // Update actor trust scores if enabled
          if (updateTrustScores && actor.name && actor.loyalty_score !== undefined) {
            // Check if actor exists
            const { data: existingActor } = await supabase
              .from('actor_trust_scores')
              .select('*')
              .eq('actor_name', actor.name)
              .maybeSingle();

            const contradictions = (actor.suspicious_behaviors || []).filter((b: any) => b.type === 'contradiction').length;
            const hiddenComms = (actor.suspicious_behaviors || []).filter((b: any) => b.type === 'hidden_communication').length;
            const brokenPromises = (actor.suspicious_behaviors || []).filter((b: any) => b.type === 'broken_promise').length;
            const helpful = (actor.positive_behaviors || []).length;

            if (existingActor) {
              // Update existing actor
              await supabase
                .from('actor_trust_scores')
                .update({
                  trust_score: actor.loyalty_score,
                  contradictions_count: (existingActor.contradictions_count || 0) + contradictions,
                  hidden_communications_count: (existingActor.hidden_communications_count || 0) + hiddenComms,
                  promises_broken_count: (existingActor.promises_broken_count || 0) + brokenPromises,
                  helpful_actions_count: (existingActor.helpful_actions_count || 0) + helpful,
                  actor_role: actor.role || existingActor.actor_role,
                  actor_institution: actor.institution || existingActor.actor_institution,
                  evidence: [...(existingActor.evidence as any[] || []), ...(actor.suspicious_behaviors || [])],
                })
                .eq('id', existingActor.id);
            } else {
              // Create new actor record
              await supabase
                .from('actor_trust_scores')
                .insert({
                  actor_name: actor.name,
                  actor_email: actor.email,
                  actor_role: actor.role,
                  actor_institution: actor.institution,
                  trust_score: actor.loyalty_score,
                  contradictions_count: contradictions,
                  hidden_communications_count: hiddenComms,
                  promises_broken_count: brokenPromises,
                  helpful_actions_count: helpful,
                  evidence: actor.suspicious_behaviors || [],
                });
            }
            results.actors_flagged++;
          }
        }

        console.log(`Thread ${currentThreadId} analyzed: ${analysis.actors_analyzed?.length || 0} actors, ${analysis.summary?.critical_issues || 0} critical issues`);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`Error analyzing thread ${currentThreadId}:`, error);
        results.errors.push(`${currentThreadId}: ${error}`);
      }
    }

    console.log('Betrayal pattern detection completed:', results);

    return new Response(JSON.stringify({
      success: true,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Betrayal detection error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
