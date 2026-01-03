import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/core.ts";
import { verifyAuth, unauthorizedResponse, badRequestResponse, successResponse, errorResponse } from "../_shared/auth.ts";

interface ApproveRequest {
  suggestionId: string;
  action: 'approve' | 'reject' | 'low_importance';
  rejectionReason?: string;
  modifications?: {
    title?: string;
    facts?: string;
    dysfunction?: string;
    institution?: string;
    type?: string;
    gravity?: string;
  };
}

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

    const body: ApproveRequest = await req.json();
    const { suggestionId, action, rejectionReason, modifications } = body;

    if (!suggestionId || !action) {
      return badRequestResponse('suggestionId and action are required');
    }

    if (!['approve', 'reject', 'low_importance'].includes(action)) {
      return badRequestResponse('action must be approve, reject, or low_importance');
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the suggestion and verify ownership
    const { data: suggestion, error: suggestionError } = await supabase
      .from('incident_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .eq('user_id', user.id)
      .single();

    if (suggestionError || !suggestion) {
      console.error('Suggestion not found:', suggestionError);
      return errorResponse('Suggestion not found or access denied', 404);
    }

    if (suggestion.status !== 'pending') {
      return badRequestResponse(`Suggestion already processed with status: ${suggestion.status}`);
    }

    // Handle rejection or low_importance
    if (action === 'reject' || action === 'low_importance') {
      const { error: updateError } = await supabase
        .from('incident_suggestions')
        .update({
          status: action,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.email || user.id,
          rejection_reason: rejectionReason || null
        })
        .eq('id', suggestionId);

      if (updateError) {
        console.error('Failed to update suggestion:', updateError);
        return errorResponse('Failed to update suggestion', 500);
      }

      // Record AI training feedback for rejected/low_importance suggestions
      await supabase.from('ai_training_feedback').insert({
        user_id: user.id,
        entity_id: suggestionId,
        entity_type: 'incident_suggestion',
        feedback_type: action === 'reject' ? 'false_positive' : 'low_importance',
        original_detection: suggestion.ai_analysis,
        user_correction: {
          action,
          reason: rejectionReason || null,
          suggested_title: suggestion.suggested_title,
          suggested_gravity: suggestion.suggested_gravity,
          confidence: suggestion.confidence
        },
        notes: rejectionReason || `Suggestion marked as ${action}`,
        used_for_training: false
      });

      // Also create ai_situation_training record for future model improvements
      if (suggestion.email_source_id) {
        await supabase.from('ai_situation_training').insert({
          user_id: user.id,
          email_id: suggestion.email_source_id,
          situation_summary: `${suggestion.suggested_title}\n\n${suggestion.suggested_facts || ''}`,
          detected_violation_type: suggestion.suggested_type,
          detected_legal_refs: suggestion.legal_mentions || [],
          ai_confidence: (suggestion.confidence || 0) / 100,
          ai_reasoning: suggestion.ai_analysis?.summary || null,
          validation_status: action === 'reject' ? 'rejected' : 'low_priority',
          user_correction: action === 'reject' ? 'Faux positif - pas un incident' : 'Peu important',
          correction_notes: rejectionReason || null,
          training_priority: action === 'reject' ? 8 : 3, // Higher priority for false positives
          is_used_for_training: false
        });
      }

      console.log(`Suggestion ${suggestionId} marked as ${action}, training feedback recorded`);

      return successResponse({
        success: true,
        action,
        suggestion: { id: suggestionId, status: action },
        trainingRecorded: true
      });
    }

    // Handle approval - create incident
    // Get next incident number
    const { data: lastIncident } = await supabase
      .from('incidents')
      .select('numero')
      .order('numero', { ascending: false })
      .limit(1)
      .single();

    const nextNumero = (lastIncident?.numero || 0) + 1;

    // Apply modifications if provided
    const finalTitle = modifications?.title || suggestion.suggested_title;
    const finalFacts = modifications?.facts || suggestion.suggested_facts;
    const finalDysfunction = modifications?.dysfunction || suggestion.suggested_dysfunction;
    const finalInstitution = modifications?.institution || suggestion.suggested_institution;
    const finalType = modifications?.type || suggestion.suggested_type;
    const finalGravity = modifications?.gravity || suggestion.suggested_gravity;

    // Create the incident
    const { data: newIncident, error: incidentError } = await supabase
      .from('incidents')
      .insert({
        numero: nextNumero,
        date_incident: new Date().toISOString().split('T')[0],
        institution: finalInstitution || 'Non spécifié',
        type: finalType || 'Communication',
        gravite: finalGravity || 'Modéré',
        statut: 'Ouvert',
        titre: finalTitle,
        faits: finalFacts || '',
        dysfonctionnement: finalDysfunction || '',
        score: Math.round((suggestion.confidence || 50) / 10),
        priorite: finalGravity === 'Critique' ? 'critique' : 
                 finalGravity === 'Grave' ? 'eleve' : 'moyen',
        email_source_id: suggestion.email_source_id,
        user_id: user.id,
        validated_at: new Date().toISOString(),
        validated_by: user.email || user.id
      })
      .select()
      .single();

    if (incidentError || !newIncident) {
      console.error('Failed to create incident:', incidentError);
      return errorResponse('Failed to create incident', 500);
    }

    // Update suggestion with approval status and link to created incident
    const { error: updateSuggestionError } = await supabase
      .from('incident_suggestions')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.email || user.id,
        created_incident_id: newIncident.id
      })
      .eq('id', suggestionId);

    if (updateSuggestionError) {
      console.error('Failed to update suggestion after approval:', updateSuggestionError);
    }

    // Link email to incident if there's a source email
    if (suggestion.email_source_id) {
      await supabase
        .from('emails')
        .update({ incident_id: newIncident.id })
        .eq('id', suggestion.email_source_id);
    }

    // Create incident event for audit trail
    await supabase
      .from('incident_events')
      .insert({
        incident_id: newIncident.id,
        user_id: user.id,
        event_type: 'creation',
        event_description: `Incident créé depuis la suggestion #${suggestionId.slice(0, 8)}`,
      });

    // Record AI training feedback for approved suggestions (positive reinforcement)
    await supabase.from('ai_training_feedback').insert({
      user_id: user.id,
      entity_id: suggestionId,
      entity_type: 'incident_suggestion',
      feedback_type: 'validated',
      original_detection: suggestion.ai_analysis,
      user_correction: {
        action: 'approved',
        modifications: modifications || null,
        incident_id: newIncident.id,
        confidence: suggestion.confidence
      },
      notes: modifications ? 'Approved with modifications' : 'Approved as-is',
      used_for_training: false
    });

    // Create ai_situation_training record for validated cases
    if (suggestion.email_source_id) {
      await supabase.from('ai_situation_training').insert({
        user_id: user.id,
        email_id: suggestion.email_source_id,
        incident_id: newIncident.id,
        situation_summary: `${finalTitle}\n\n${finalFacts || ''}`,
        detected_violation_type: finalType,
        detected_legal_refs: suggestion.legal_mentions || [],
        ai_confidence: (suggestion.confidence || 0) / 100,
        ai_reasoning: suggestion.ai_analysis?.summary || null,
        validation_status: modifications ? 'corrected' : 'validated',
        user_correction: modifications ? JSON.stringify(modifications) : null,
        correct_legal_refs: suggestion.legal_mentions || [],
        training_priority: 5, // Medium priority for validated cases
        is_used_for_training: false
      });
    }

    console.log(`Suggestion ${suggestionId} approved, incident ${newIncident.id} created, training feedback recorded`);

    return successResponse({
      success: true,
      action: 'approved',
      incident: newIncident,
      suggestion: { id: suggestionId, status: 'approved' },
      trainingRecorded: true
    });

  } catch (error: unknown) {
    console.error('Error in approve-suggestion:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(message, 500);
  }
});
