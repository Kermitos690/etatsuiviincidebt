import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LegalReference {
  code: string;
  article: string;
  text?: string;
  confidence: number;
  reasoning?: string;
}

interface SituationAnalysis {
  summary: string;
  violationType: string;
  legalRefs: LegalReference[];
  confidence: number;
  reasoning: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await verifyAuth(req);
    if (authResult.error || !authResult.user) {
      return new Response(JSON.stringify({ error: authResult.error || 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = authResult.user.id;
    const { action, limit = 10 } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (action === 'generate-situations') {
      // Trouver les emails récents non encore analysés pour l'entraînement
      const { data: emails, error: emailError } = await supabase
        .from('emails')
        .select('id, subject, body, sender, received_at, ai_analysis')
        .eq('user_id', userId)
        .not('ai_analysis', 'is', null)
        .order('received_at', { ascending: false })
        .limit(limit);

      if (emailError) throw emailError;

      // Vérifier lesquels n'ont pas encore de situation training
      const { data: existingTraining } = await supabase
        .from('ai_situation_training')
        .select('email_id')
        .eq('user_id', userId);

      const existingEmailIds = new Set(existingTraining?.map(t => t.email_id) || []);
      const emailsToAnalyze = emails?.filter(e => !existingEmailIds.has(e.id)) || [];

      // Analyser chaque email avec l'IA pour extraire situations et refs légales
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      const situations: any[] = [];

      for (const email of emailsToAnalyze.slice(0, 5)) { // Limiter à 5 par appel
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
                {
                  role: 'system',
                  content: `Tu es un expert juridique français. Analyse cet email et extrait:
1. Un résumé de la situation factuelle
2. Le type de violation potentielle (ex: défaut d'information, discrimination, abus de pouvoir, etc.)
3. Les références légales applicables (Code Civil, Code Pénal, CEDH, etc.)

Réponds en JSON avec cette structure:
{
  "summary": "résumé factuel de la situation",
  "violationType": "type de violation détectée",
  "legalRefs": [
    {"code": "Code Civil", "article": "Article 1240", "text": "texte de l'article si connu", "confidence": 0.8, "reasoning": "pourquoi cet article s'applique"}
  ],
  "confidence": 0.7,
  "reasoning": "explication du raisonnement juridique"
}`
                },
                {
                  role: 'user',
                  content: `Sujet: ${email.subject}\n\nExpéditeur: ${email.sender}\n\nContenu:\n${email.body?.substring(0, 3000)}`
                }
              ],
              tools: [
                {
                  type: 'function',
                  function: {
                    name: 'analyze_legal_situation',
                    description: 'Analyse une situation et extrait les références légales',
                    parameters: {
                      type: 'object',
                      properties: {
                        summary: { type: 'string', description: 'Résumé factuel de la situation' },
                        violationType: { type: 'string', description: 'Type de violation détectée' },
                        legalRefs: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              code: { type: 'string' },
                              article: { type: 'string' },
                              text: { type: 'string' },
                              confidence: { type: 'number' },
                              reasoning: { type: 'string' }
                            },
                            required: ['code', 'article', 'confidence']
                          }
                        },
                        confidence: { type: 'number', description: 'Confiance globale 0-1' },
                        reasoning: { type: 'string', description: 'Raisonnement juridique' }
                      },
                      required: ['summary', 'violationType', 'legalRefs', 'confidence', 'reasoning']
                    }
                  }
                }
              ],
              tool_choice: { type: 'function', function: { name: 'analyze_legal_situation' } }
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
            
            if (toolCall?.function?.arguments) {
              const analysis: SituationAnalysis = JSON.parse(toolCall.function.arguments);
              
              // Insérer dans ai_situation_training
              const { data: inserted, error: insertError } = await supabase
                .from('ai_situation_training')
                .insert({
                  user_id: userId,
                  email_id: email.id,
                  situation_summary: analysis.summary,
                  detected_violation_type: analysis.violationType,
                  detected_legal_refs: analysis.legalRefs,
                  ai_confidence: analysis.confidence,
                  ai_reasoning: analysis.reasoning,
                  validation_status: 'pending',
                  training_priority: Math.round(analysis.confidence * 100)
                })
                .select()
                .single();

              if (!insertError && inserted) {
                situations.push(inserted);

                // Ajouter à la file d'active learning si incertitude élevée
                if (analysis.confidence < 0.7) {
                  await supabase.from('active_learning_queue').insert({
                    user_id: userId,
                    entity_type: 'situation',
                    entity_id: inserted.id,
                    proposal_reason: `Confiance faible (${Math.round(analysis.confidence * 100)}%). Validation recommandée.`,
                    uncertainty_score: 1 - analysis.confidence,
                    potential_learning_value: (1 - analysis.confidence) * analysis.legalRefs.length,
                    context_summary: analysis.summary,
                    suggested_questions: [
                      'Les références légales citées sont-elles correctes?',
                      'Y a-t-il d\'autres articles applicables?',
                      'Le type de violation est-il exact?'
                    ]
                  });
                }
              }
            }
          }
        } catch (err) {
          console.error(`Error analyzing email ${email.id}:`, err);
        }
        
        // Petit délai entre les appels
        await new Promise(r => setTimeout(r, 500));
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          generated: situations.length,
          situations 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-queue') {
      const { data: queue, error } = await supabase
        .from('active_learning_queue')
        .select(`
          *,
          ai_situation_training!inner(
            id,
            situation_summary,
            detected_violation_type,
            detected_legal_refs,
            ai_confidence,
            ai_reasoning,
            email_id,
            emails!inner(subject, sender, received_at)
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('uncertainty_score', { ascending: false })
        .limit(limit);

      if (error) {
        // Fallback sans la jointure complexe
        const { data: simpleQueue, error: simpleError } = await supabase
          .from('active_learning_queue')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'pending')
          .order('uncertainty_score', { ascending: false })
          .limit(limit);
        
        if (simpleError) throw simpleError;
        return new Response(
          JSON.stringify({ success: true, queue: simpleQueue }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, queue }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'validate-situation') {
      const { situationId, validationStatus, userCorrection, correctLegalRefs, correctionNotes } = await req.json();

      const { data, error } = await supabase
        .from('ai_situation_training')
        .update({
          validation_status: validationStatus,
          user_correction: userCorrection,
          correct_legal_refs: correctLegalRefs,
          correction_notes: correctionNotes,
          is_used_for_training: true,
          trained_at: new Date().toISOString()
        })
        .eq('id', situationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // Marquer comme revu dans la queue
      await supabase
        .from('active_learning_queue')
        .update({ status: 'reviewed', reviewed_at: new Date().toISOString() })
        .eq('entity_id', situationId)
        .eq('user_id', userId);

      // Si l'utilisateur a fourni des corrections, créer les références légales
      if (correctLegalRefs && Array.isArray(correctLegalRefs)) {
        for (const ref of correctLegalRefs) {
          await supabase.from('legal_references').upsert({
            user_id: userId,
            code_name: ref.code,
            article_number: ref.article,
            article_text: ref.text,
            domain: data.detected_violation_type,
            is_verified: validationStatus === 'correct',
            verified_at: validationStatus === 'correct' ? new Date().toISOString() : null,
            notes: correctionNotes
          }, {
            onConflict: 'user_id,code_name,article_number'
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, situation: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-pending-situations') {
      const { data, error } = await supabase
        .from('ai_situation_training')
        .select(`
          *,
          emails(id, subject, sender, received_at, body)
        `)
        .eq('user_id', userId)
        .eq('validation_status', 'pending')
        .order('training_priority', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, situations: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-training-stats') {
      const { data: stats, error } = await supabase
        .from('ai_situation_training')
        .select('validation_status')
        .eq('user_id', userId);

      if (error) throw error;

      const counts = {
        total: stats.length,
        pending: stats.filter(s => s.validation_status === 'pending').length,
        correct: stats.filter(s => s.validation_status === 'correct').length,
        incorrect: stats.filter(s => s.validation_status === 'incorrect').length,
        needsVerification: stats.filter(s => s.validation_status === 'needs_verification').length,
        partiallyCorrect: stats.filter(s => s.validation_status === 'partially_correct').length,
      };

      const { count: legalRefsCount } = await supabase
        .from('legal_references')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { count: verifiedRefsCount } = await supabase
        .from('legal_references')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_verified', true);

      return new Response(
        JSON.stringify({ 
          success: true, 
          stats: {
            situations: counts,
            legalRefs: {
              total: legalRefsCount || 0,
              verified: verifiedRefsCount || 0
            }
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Active learning error:', err);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
