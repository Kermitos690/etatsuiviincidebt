import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const CROSS_REFERENCE_PROMPT = `Tu es un expert en corroboration de preuves juridiques.

MISSION: Analyser les preuves provenant de différentes sources (emails, pièces jointes) et déterminer si elles se corroborent.

RÈGLES:
1. Une preuve est CORROBORÉE si elle est confirmée par au moins 2 sources indépendantes
2. Une preuve est PARTIELLE si elle apparaît dans une seule source mais sans contradiction
3. Une preuve est CONTRADICTOIRE si des sources donnent des informations conflictuelles
4. Une preuve est NON VÉRIFIÉE si les sources sont insuffisantes

Pour chaque incident potentiel, tu dois:
1. Lister TOUTES les citations qui le soutiennent (avec leur source)
2. Lister TOUTES les citations qui le contredisent (avec leur source)
3. Évaluer le niveau de corroboration
4. Donner un score de confiance final (0-100)

FORMAT JSON:
{
  "corroborations": [
    {
      "incident_summary": "Description courte de l'incident",
      "corroboration_type": "confirmed/partial/contradicted/unverified",
      "supporting_evidence": [
        {
          "source_type": "thread_analysis/attachment",
          "source_id": "ID de la source",
          "citation": "Citation exacte",
          "relevance": "Explication de pourquoi cette preuve est pertinente"
        }
      ],
      "contradicting_evidence": [
        {
          "source_type": "thread_analysis/attachment",
          "source_id": "ID de la source",
          "citation": "Citation exacte",
          "contradiction": "Explication de la contradiction"
        }
      ],
      "final_confidence": 85,
      "reasoning": "Explication du raisonnement pour le score de confiance",
      "recommended_action": "Action recommandée (créer incident, investigation supplémentaire, rejeter)"
    }
  ]
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
  };
}

interface Corroboration {
  incident_summary: string;
  corroboration_type: string;
  supporting_evidence: {
    source_type: string;
    source_id: string;
    citation: string;
    relevance: string;
  }[];
  contradicting_evidence: {
    source_type: string;
    source_id: string;
    citation: string;
    contradiction: string;
  }[];
  final_confidence: number;
  reasoning: string;
  recommended_action: string;
}

async function crossReferenceWithAI(
  threadAnalyses: ThreadAnalysis[],
  attachmentAnalyses: AttachmentAnalysis[]
): Promise<Corroboration[]> {
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured');
    return [];
  }

  // Build context from all sources
  const threadContext = threadAnalyses.map(ta => ({
    id: ta.id,
    thread_id: ta.thread_id,
    issues: ta.detected_issues,
    citations: ta.citations,
  }));

  const attachmentContext = attachmentAnalyses.map(aa => ({
    id: aa.id,
    email_id: aa.email_id,
    filename: aa.filename,
    analysis: aa.ai_analysis,
  }));

  const userPrompt = `Analyse ces sources et identifie les incidents qui peuvent être corroborés.

ANALYSES DE THREADS (${threadAnalyses.length} threads):
${JSON.stringify(threadContext, null, 2)}

ANALYSES DE PIÈCES JOINTES (${attachmentAnalyses.length} documents):
${JSON.stringify(attachmentContext, null, 2)}

Identifie tous les incidents potentiels et évalue leur niveau de corroboration.
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
          { role: 'system', content: CROSS_REFERENCE_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', await response.text());
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) return [];

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.corroborations || [];
  } catch (error) {
    console.error('Cross-reference AI error:', error);
    return [];
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

    const { createIncidents = true, batchSize = 20 } = await req.json().catch(() => ({}));

    console.log('Starting cross-reference analysis (Pass 3)...');

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
        results: { processed: 0, corroborations: 0, incidents: 0 }
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

    // Perform cross-reference analysis
    const corroborations = await crossReferenceWithAI(
      newThreadAnalyses as ThreadAnalysis[],
      attachmentAnalyses as AttachmentAnalysis[]
    );

    console.log(`Found ${corroborations.length} corroborations`);

    const results = {
      processed: newThreadAnalyses.length,
      corroborations: 0,
      incidents: 0,
      errors: [] as string[],
    };

    for (const corroboration of corroborations) {
      try {
        // Store corroboration
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
            notes: corroboration.reasoning,
          })
          .select()
          .single();

        if (insertError) {
          results.errors.push(`Corroboration insert error: ${insertError.message}`);
          continue;
        }

        results.corroborations++;

        // Create incident if confidence is high enough and action recommends it
        if (
          createIncidents &&
          corroboration.final_confidence >= 70 &&
          corroboration.recommended_action === 'créer incident' &&
          corroboration.corroboration_type !== 'contradicted'
        ) {
          // Determine severity based on corroboration
          const severityMap: Record<string, string> = {
            'confirmed': 'élevée',
            'partial': 'moyenne',
            'unverified': 'faible',
          };

          const { error: incidentError } = await supabase
            .from('incidents')
            .insert({
              titre: corroboration.incident_summary.slice(0, 100),
              faits: corroboration.reasoning,
              dysfonctionnement: corroboration.incident_summary,
              institution: 'À déterminer',
              date_incident: new Date().toISOString().split('T')[0],
              gravite: severityMap[corroboration.corroboration_type] || 'moyenne',
              type: 'Corroboré automatiquement',
              statut: 'Ouvert',
              priorite: corroboration.final_confidence >= 90 ? 'élevée' : 'moyenne',
              score: Math.round(corroboration.final_confidence),
              confidence_level: `${corroboration.final_confidence}%`,
              preuves: {
                supporting: corroboration.supporting_evidence,
                contradicting: corroboration.contradicting_evidence,
                corroboration_id: corroborationRecord?.id,
              },
            });

          if (incidentError) {
            results.errors.push(`Incident creation error: ${incidentError.message}`);
          } else {
            results.incidents++;
            console.log(`Created incident: ${corroboration.incident_summary}`);
          }
        }
      } catch (error) {
        console.error('Error processing corroboration:', error);
        results.errors.push(`Processing error: ${error}`);
      }
    }

    console.log('Cross-reference analysis completed:', results);

    return new Response(JSON.stringify({
      success: true,
      results,
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
