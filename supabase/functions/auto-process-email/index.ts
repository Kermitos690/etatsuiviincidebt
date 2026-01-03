import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, log } from "../_shared/core.ts";
import { verifyAuth, unauthorizedResponse, createServiceClient } from "../_shared/auth.ts";
import { buildTrainingPromptContext, recordTrainingCase } from "../_shared/training.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Verify authentication
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return unauthorizedResponse(authError || 'Authentication required');
    }

    const { emailId, autoCreate = true, confidenceThreshold = 70 } = await req.json();

    if (!emailId) {
      return new Response(JSON.stringify({ error: 'emailId required' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      });
    }

    // Verify email ownership
    const { data: emailOwnership } = await supabase
      .from('emails')
      .select('id')
      .eq('id', emailId)
      .eq('user_id', user.id)
      .single();

    if (!emailOwnership) {
      return new Response(JSON.stringify({ error: 'Email not found or access denied' }), {
        status: 403,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      });
    }

    // Get the email
    const { data: email, error: emailError } = await supabase
      .from('emails')
      .select('*')
      .eq('id', emailId)
      .single();

    if (emailError || !email) {
      return new Response(JSON.stringify({ error: 'Email not found' }), {
        status: 404,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      });
    }

    // If already processed, return existing analysis
    if (email.processed && email.ai_analysis) {
      return new Response(JSON.stringify({ 
        success: true, 
        analysis: email.ai_analysis,
        alreadyProcessed: true 
      }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      });
    }

    // ==========================================
    // PHASE 2: DB-FIRST LEGAL DETECTION
    // ==========================================
    let legalMentions = [];
    try {
      console.log(`[auto-process-email] Running legal detection for email ${emailId}`);
      
      const { data: detectionResult, error: detectionError } = await supabase.functions.invoke('email-legal-detection', {
        body: {
          email_id: emailId,
          subject: email.subject,
          body: email.body,
          from: email.sender,
          date: email.received_at,
        }
      });

      if (detectionError) {
        console.error('[auto-process-email] Legal detection error:', detectionError);
      } else if (detectionResult?.success) {
        legalMentions = detectionResult.mentions || [];
        console.log(`[auto-process-email] Found ${legalMentions.length} legal mentions`);
      }
    } catch (e) {
      console.error('[auto-process-email] Legal detection failed:', e);
    }

    // Call AI to analyze the email
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      });
    }

    // ==========================================
    // DB-FIRST: FETCH TRAINING DATA FOR PROMPT ENRICHMENT
    // ==========================================
    console.log(`[auto-process-email] Fetching training data for prompt enrichment...`);
    const trainingContext = await buildTrainingPromptContext(supabase, user.id);
    console.log(`[auto-process-email] Training context: ${trainingContext ? 'enriched' : 'empty'}`);

    // Build context from legal mentions for AI
    const legalContext = legalMentions.length > 0 
      ? `\n\nRéférences légales détectées dans l'email:\n${legalMentions.map((m: any) => `- ${m.match_text} (confiance: ${Math.round(m.confidence * 100)}%)`).join('\n')}`
      : '';

    const systemPrompt = `Tu es un expert juridique suisse spécialisé dans l'analyse des emails liés à la curatelle. 
Analyse cet email et détermine s'il contient un incident administratif à signaler.
${legalContext}
${trainingContext}

IMPORTANT: Si des exemples de FAUX POSITIFS sont listés ci-dessus, NE PAS détecter des incidents similaires.
Si des exemples VALIDÉS sont listés, utilise-les comme référence pour ta détection.

Retourne un JSON avec:
{
  "isIncident": boolean,
  "confidence": number (0-100),
  "suggestedTitle": "titre court de l'incident",
  "suggestedFacts": "description factuelle",
  "suggestedDysfunction": "dysfonctionnement identifié",
  "suggestedInstitution": "institution concernée",
  "suggestedType": "type d'incident",
  "suggestedGravity": "Mineur|Modéré|Grave|Critique",
  "summary": "résumé court",
  "legalReferences": ["liste des références légales mentionnées"]
}`;

    const userMessage = `Email de: ${email.sender}
Sujet: ${email.subject}
Date: ${email.received_at}
Contenu:
${email.body?.slice(0, 4000) || 'Corps vide'}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI error:', errorText);
      return new Response(JSON.stringify({ error: 'AI analysis failed' }), {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '{}';
    
    // Parse AI response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { isIncident: false, confidence: 0 };
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      analysis = { isIncident: false, confidence: 0, summary: 'Analyse impossible' };
    }

    // Add legal mentions to analysis
    analysis.legalMentionsCount = legalMentions.length;
    analysis.legalMentionsResolved = legalMentions.filter((m: any) => m.resolved).length;
    analysis.dbFirstEnforced = true;
    analysis.trainingDataUsed = trainingContext.length > 0;

    // ==========================================
    // RECORD THIS ANALYSIS FOR FUTURE TRAINING
    // ==========================================
    if (analysis.isIncident && analysis.confidence >= 50) {
      await recordTrainingCase(supabase, {
        userId: user.id,
        emailId: emailId,
        situationSummary: `${email.subject}\n\n${analysis.suggestedFacts || analysis.summary || ''}`,
        detectedViolationType: analysis.suggestedType,
        detectedLegalRefs: analysis.legalReferences || legalMentions,
        aiConfidence: analysis.confidence / 100,
        aiReasoning: analysis.summary,
        trainingPriority: analysis.confidence >= 80 ? 3 : 5 // Lower priority for high confidence
      });
      console.log(`[auto-process-email] Recorded training case for email ${emailId}`);
    }

    // Update email with analysis
    const { error: updateError } = await supabase
      .from('emails')
      .update({
        ai_analysis: analysis,
        processed: true
      })
      .eq('id', emailId);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    // Create a suggestion for validation instead of auto-creating incident
    let suggestionCreated = false;
    let suggestion = null;

    if (analysis.isIncident && analysis.confidence >= 30) {
      // Check if suggestion already exists for this email
      const { data: existingSuggestion } = await supabase
        .from('incident_suggestions')
        .select('id')
        .eq('email_source_id', emailId)
        .maybeSingle();

      if (!existingSuggestion) {
        const { data: newSuggestion, error: suggestionError } = await supabase
          .from('incident_suggestions')
          .insert({
            user_id: email.user_id,
            email_source_id: emailId,
            suggested_title: analysis.suggestedTitle || email.subject,
            suggested_facts: analysis.suggestedFacts || '',
            suggested_dysfunction: analysis.suggestedDysfunction || '',
            suggested_institution: analysis.suggestedInstitution || 'Non spécifié',
            suggested_type: analysis.suggestedType || 'Communication',
            suggested_gravity: analysis.suggestedGravity || 'Modéré',
            confidence: Math.round(analysis.confidence),
            ai_analysis: analysis,
            legal_mentions: legalMentions,
            status: 'pending'
          })
          .select()
          .single();

        if (!suggestionError && newSuggestion) {
          suggestionCreated = true;
          suggestion = newSuggestion;
          console.log(`[auto-process-email] Created suggestion ${newSuggestion.id} for email ${emailId}`);
        } else if (suggestionError) {
          console.error('[auto-process-email] Failed to create suggestion:', suggestionError);
        }
      } else {
        console.log(`[auto-process-email] Suggestion already exists for email ${emailId}`);
        suggestion = existingSuggestion;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      analysis,
      legalMentions: {
        total: legalMentions.length,
        resolved: legalMentions.filter((m: any) => m.resolved).length,
      },
      suggestionCreated,
      suggestion,
      dbFirstEnforced: true,
    }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });
  }
});
