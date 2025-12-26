import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, verifyAuth, unauthorizedResponse } from "../_shared/auth.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Prompt ultra-avancé pour la corroboration multi-sources
const ADVANCED_CORROBORATION_PROMPT = `Tu es un expert en corroboration de preuves juridiques avec une rigueur suisse absolue.

🔒 RÈGLES DE CORROBORATION STRICTES 🔒

1. **HIÉRARCHIE DES PREUVES**
   - NIVEAU 1 (Preuve directe): Document officiel signé, décision formelle, email explicite
   - NIVEAU 2 (Preuve indirecte): Témoignage écrit, référence à un document, aveu implicite
   - NIVEAU 3 (Indice): Comportement suspect, pattern récurrent, omission suspecte

2. **TYPES DE CORROBORATION**
   - CORROBORÉ (confirmed): Même fait confirmé par 2+ sources INDÉPENDANTES de niveau 1-2
   - PARTIELLEMENT CORROBORÉ (partial): Fait soutenu par 1 source niveau 1 OU 2+ sources niveau 2-3
   - CONTRADICTOIRE (contradicted): Sources donnent des versions incompatibles du même fait
   - NON VÉRIFIÉ (unverified): Source unique de niveau 2-3, pas de confirmation

3. **DÉTECTION DES PATTERNS RÉCURRENTS**
   Pour chaque institution/acteur, identifie:
   - Délais répétés (même type de retard plusieurs fois)
   - Refus systématiques (même type de refus sur différents sujets)
   - Non-réponses chroniques (demandes restées sans réponse)
   - Violations récurrentes (même article de loi violé plusieurs fois)

4. **MATRICE DE CORROBORATION**
   Compare CHAQUE affirmation entre:
   - Emails vs Emails (cohérence interne)
   - Emails vs Pièces jointes (documents confirment-ils les dires?)
   - Pièces jointes vs Pièces jointes (documents cohérents entre eux?)
   - Promesses vs Actions (ce qui est dit vs ce qui est fait)

5. **SCORE DE FIABILITÉ PAR SOURCE**
   Chaque source reçoit un score basé sur:
   - Ses contradictions passées (pénalité de -10 par contradiction)
   - Ses promesses non tenues (pénalité de -15 par promesse brisée)
   - Sa cohérence globale (bonus de +5 par fait corroboré)

6. **BASES LÉGALES SUISSES**
   Référence obligatoire aux articles pertinents:
   - Protection de l'adulte: Art. 388-456 CC
   - Procédure: Art. 26-46a PA, Art. 52-160 CPC
   - Droits fondamentaux: Art. 7-30 Cst.
   - Protection des données: Art. 1-32 LPD

FORMAT JSON:
{
  "analysis_metadata": {
    "date": "YYYY-MM-DD",
    "sources_analyzed": {
      "threads": 0,
      "attachments": 0,
      "total_citations": 0
    }
  },
  "corroborations": [
    {
      "incident_summary": "Description courte et factuelle de l'incident",
      "incident_category": "délai/refus/non-réponse/violation_droits/conflit_intérêt/abus/autre",
      "corroboration_type": "confirmed/partial/contradicted/unverified",
      "evidence_level": "NIVEAU_1/NIVEAU_2/NIVEAU_3",
      "supporting_evidence": [
        {
          "source_type": "thread_analysis/attachment/email",
          "source_id": "ID",
          "citation": "Citation EXACTE",
          "relevance": "Explication de la pertinence",
          "evidence_level": "NIVEAU_1/NIVEAU_2/NIVEAU_3"
        }
      ],
      "contradicting_evidence": [
        {
          "source_type": "thread_analysis/attachment/email",
          "source_id": "ID",
          "citation": "Citation EXACTE",
          "contradiction": "Nature de la contradiction"
        }
      ],
      "legal_references": [
        {
          "article": "Art. XXX CC/PA/Cst./LPD",
          "violation_type": "Description de la violation",
          "severity": "critique/élevée/moyenne/faible"
        }
      ],
      "final_confidence": 85,
      "confidence_breakdown": {
        "evidence_quality": 30,
        "source_reliability": 25,
        "corroboration_strength": 30
      },
      "is_recurring": false,
      "recurrence_count": 0,
      "recommended_action": "créer incident/investigation/signalement JP/classement"
    }
  ],
  "recurring_patterns": [
    {
      "pattern_type": "délai_chronique/refus_systématique/non-réponse_répétée/violation_récurrente",
      "institution": "Nom de l'institution",
      "actor": "Nom de l'acteur si applicable",
      "occurrence_count": 0,
      "first_occurrence": "YYYY-MM-DD",
      "last_occurrence": "YYYY-MM-DD",
      "evidence_summary": ["Liste des preuves"],
      "legal_implications": "Implications légales (récidive, aggravation)",
      "recommended_action": "Action recommandée"
    }
  ],
  "source_reliability_matrix": [
    {
      "source_name": "Nom de l'institution/personne",
      "reliability_score": 75,
      "contradictions_found": 0,
      "promises_broken": 0,
      "facts_corroborated": 0,
      "assessment": "fiable/vigilance/suspect"
    }
  ],
  "cross_reference_matrix": {
    "emails_vs_emails": {
      "total_comparisons": 0,
      "consistent": 0,
      "contradictions": 0
    },
    "emails_vs_attachments": {
      "total_comparisons": 0,
      "confirmed": 0,
      "contradicted": 0
    },
    "promises_vs_actions": {
      "total_promises": 0,
      "kept": 0,
      "broken": 0
    }
  },
  "summary": {
    "total_incidents": 0,
    "confirmed_incidents": 0,
    "high_priority_actions": ["Actions prioritaires"],
    "main_concerns": ["Préoccupations principales"]
  }
}`;

interface ThreadAnalysis {
  id: string;
  thread_id: string;
  detected_issues: {
    type: string;
    description: string;
    severity: string;
    confidence: string;
    citations: { text: string; source: string }[];
  }[];
  citations: { text: string; source: string }[];
  chronological_summary: string;
  participants: any[];
}

interface AttachmentAnalysis {
  id: string;
  email_id: string;
  filename: string;
  ai_analysis: {
    summary?: string;
    key_findings?: string[];
    problems_detected?: string[];
    legal_violations?: string[];
    extracted_text?: string;
  };
}

interface CorroborationResult {
  analysis_metadata: any;
  corroborations: any[];
  recurring_patterns: any[];
  source_reliability_matrix: any[];
  cross_reference_matrix: any;
  summary: any;
}

async function advancedCorroboration(
  threadAnalyses: ThreadAnalysis[],
  attachmentAnalyses: AttachmentAnalysis[]
): Promise<CorroborationResult | null> {
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured');
    return null;
  }

  // Build comprehensive context
  const threadContext = threadAnalyses.map(ta => ({
    id: ta.id,
    thread_id: ta.thread_id,
    summary: ta.chronological_summary,
    issues: ta.detected_issues,
    citations: ta.citations,
    participants: ta.participants,
  }));

  const attachmentContext = attachmentAnalyses.map(aa => ({
    id: aa.id,
    email_id: aa.email_id,
    filename: aa.filename,
    analysis: aa.ai_analysis,
  }));

  const userPrompt = `Effectue une corroboration EXHAUSTIVE et ULTRA-RIGOUREUSE de ces sources.

ANALYSES DE THREADS (${threadAnalyses.length} threads):
${JSON.stringify(threadContext, null, 2)}

ANALYSES DE PIÈCES JOINTES (${attachmentAnalyses.length} documents):
${JSON.stringify(attachmentContext, null, 2)}

INSTRUCTIONS:
1. Compare CHAQUE fait entre les différentes sources
2. Identifie TOUS les patterns récurrents
3. Calcule un score de fiabilité pour chaque source
4. Référence les articles de loi suisse violés
5. Ne fais AUCUNE supposition - cite UNIQUEMENT ce qui est explicite

Réponds UNIQUEMENT en JSON valide.`;

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
          { role: 'system', content: ADVANCED_CORROBORATION_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', await response.text());
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) return null;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]) as CorroborationResult;
  } catch (error) {
    console.error('Advanced corroboration error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return unauthorizedResponse(authError || 'Non autorisé');
    }

    console.log(`User ${user.email} executing cross-reference-analysis`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { createIncidents = true, batchSize = 20, trackRecurrence = true } = await req.json().catch(() => ({}));

    // Get thread analyses that haven't been corroborated yet
    const { data: existingCorroborations } = await supabase
      .from('corroborations')
      .select('thread_analysis_ids');
    
    const corroboratedThreadIds = new Set(
      existingCorroborations?.flatMap(c => c.thread_analysis_ids || []) || []
    );

    // Get recent thread analyses
    const { data: threadAnalyses, error: taError } = await supabase
      .from('thread_analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(batchSize);

    if (taError) throw taError;

    const newThreadAnalyses = (threadAnalyses || []).filter(
      ta => !corroboratedThreadIds.has(ta.id)
    );

    if (newThreadAnalyses.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No new thread analyses to corroborate',
        results: { processed: 0, corroborations: 0, incidents: 0, patterns: 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get email IDs from thread analyses
    const emailIds = [...new Set(newThreadAnalyses.flatMap(ta => ta.email_ids || []))];

    // Get attachment analyses for these emails
    const { data: attachments } = await supabase
      .from('email_attachments')
      .select('id, email_id, filename, ai_analysis')
      .in('email_id', emailIds)
      .not('ai_analysis', 'is', null);

    const attachmentAnalyses = (attachments || []).filter(a => a.ai_analysis);

    console.log(`Cross-referencing ${newThreadAnalyses.length} thread analyses with ${attachmentAnalyses.length} attachment analyses`);

    // Perform advanced corroboration
    const analysisResult = await advancedCorroboration(
      newThreadAnalyses as ThreadAnalysis[],
      attachmentAnalyses as AttachmentAnalysis[]
    );

    if (!analysisResult) {
      return new Response(JSON.stringify({
        success: false,
        error: 'AI analysis failed'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${analysisResult.corroborations?.length || 0} corroborations`);

    const results = {
      processed: newThreadAnalyses.length,
      corroborations: 0,
      incidents: 0,
      patterns: 0,
      errors: [] as string[],
    };

    // Store corroborations
    for (const corroboration of analysisResult.corroborations || []) {
      try {
        const { data: corroborationRecord, error: insertError } = await supabase
          .from('corroborations')
          .insert({
            thread_analysis_ids: newThreadAnalyses.map(ta => ta.id),
            attachment_ids: attachmentAnalyses.map(aa => aa.id),
            corroboration_type: corroboration.corroboration_type,
            supporting_evidence: corroboration.supporting_evidence,
            contradicting_evidence: corroboration.contradicting_evidence,
            final_confidence: corroboration.final_confidence / 100,
            verification_status: corroboration.final_confidence >= 80 ? 'verified' : 'needs_review',
            notes: JSON.stringify({
              incident_summary: corroboration.incident_summary,
              incident_category: corroboration.incident_category,
              legal_references: corroboration.legal_references,
              is_recurring: corroboration.is_recurring,
              recurrence_count: corroboration.recurrence_count,
            }),
          })
          .select()
          .single();

        if (insertError) {
          results.errors.push(`Corroboration insert error: ${insertError.message}`);
          continue;
        }

        results.corroborations++;

        // Create incident if confidence is high enough
        if (
          createIncidents &&
          corroboration.final_confidence >= 70 &&
          corroboration.recommended_action === 'créer incident' &&
          corroboration.corroboration_type !== 'contradicted'
        ) {
          const severityMap: Record<string, string> = {
            'confirmed': 'élevée',
            'partial': 'moyenne',
            'unverified': 'faible',
          };

          const { error: incidentError } = await supabase
            .from('incidents')
            .insert({
              titre: corroboration.incident_summary.slice(0, 100),
              faits: JSON.stringify(corroboration.supporting_evidence),
              dysfonctionnement: corroboration.incident_summary,
              institution: 'À déterminer',
              date_incident: new Date().toISOString().split('T')[0],
              gravite: severityMap[corroboration.corroboration_type] || 'moyenne',
              type: corroboration.incident_category || 'Corroboré automatiquement',
              statut: 'Ouvert',
              priorite: corroboration.final_confidence >= 90 ? 'élevée' : 'moyenne',
              score: Math.round(corroboration.final_confidence),
              confidence_level: `${corroboration.final_confidence}%`,
              preuves: {
                supporting: corroboration.supporting_evidence,
                contradicting: corroboration.contradicting_evidence,
                legal_references: corroboration.legal_references,
                corroboration_id: corroborationRecord?.id,
              },
            });

          if (!incidentError) {
            results.incidents++;
            console.log(`Created incident: ${corroboration.incident_summary}`);
          }
        }
      } catch (error) {
        console.error('Error processing corroboration:', error);
        results.errors.push(`Processing error: ${error}`);
      }
    }

    // Track recurring patterns
    if (trackRecurrence && analysisResult.recurring_patterns) {
      for (const pattern of analysisResult.recurring_patterns) {
        try {
          // Check if pattern already exists
          const { data: existingPattern } = await supabase
            .from('recurrence_tracking')
            .select('*')
            .eq('institution', pattern.institution)
            .eq('violation_type', pattern.pattern_type)
            .maybeSingle();

          if (existingPattern) {
            // Update existing pattern
            await supabase
              .from('recurrence_tracking')
              .update({
                occurrence_count: existingPattern.occurrence_count + pattern.occurrence_count,
                last_occurrence: pattern.last_occurrence,
                legal_implications: pattern.legal_implications,
                related_incidents: [
                  ...(existingPattern.related_incidents as any[] || []),
                  ...pattern.evidence_summary,
                ],
              })
              .eq('id', existingPattern.id);
          } else {
            // Create new pattern
            await supabase
              .from('recurrence_tracking')
              .insert({
                institution: pattern.institution,
                violation_type: pattern.pattern_type,
                occurrence_count: pattern.occurrence_count,
                first_occurrence: pattern.first_occurrence,
                last_occurrence: pattern.last_occurrence,
                legal_implications: pattern.legal_implications,
                related_incidents: pattern.evidence_summary,
              });
          }
          results.patterns++;
        } catch (error) {
          console.error('Error tracking pattern:', error);
        }
      }
    }

    // Update source reliability scores
    if (analysisResult.source_reliability_matrix) {
      for (const source of analysisResult.source_reliability_matrix) {
        try {
          const { data: existingActor } = await supabase
            .from('actor_trust_scores')
            .select('*')
            .eq('actor_name', source.source_name)
            .maybeSingle();

          if (existingActor) {
            await supabase
              .from('actor_trust_scores')
              .update({
                trust_score: source.reliability_score,
                contradictions_count: existingActor.contradictions_count + source.contradictions_found,
                helpful_actions_count: existingActor.helpful_actions_count + source.facts_corroborated,
              })
              .eq('id', existingActor.id);
          } else {
            await supabase
              .from('actor_trust_scores')
              .insert({
                actor_name: source.source_name,
                actor_institution: source.source_name,
                trust_score: source.reliability_score,
                contradictions_count: source.contradictions_found,
                helpful_actions_count: source.facts_corroborated,
              });
          }
        } catch (error) {
          console.error('Error updating source reliability:', error);
        }
      }
    }

    console.log('Advanced cross-reference analysis completed:', results);

    return new Response(JSON.stringify({
      success: true,
      results,
      analysis_summary: analysisResult.summary,
      cross_reference_matrix: analysisResult.cross_reference_matrix,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Cross-reference error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
