import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Types de feedback pour l'entraînement IA
 * 
 * Sources d'entraînement:
 * - Gmail: emails, threads, analyse de threads
 * - PDF/Situations: documents, analyses de situation
 * - Swipe Training: paires d'emails validées/rejetées
 * - Incidents: création, modification, suppression
 */
export type FeedbackType = 
  // Email actions
  | 'email_deleted' 
  | 'email_marked_important' 
  | 'email_archived'
  // Incident actions
  | 'incident_created'
  | 'incident_modified'
  | 'incident_deleted'
  // Situation training (active learning)
  | 'situation_correct'
  | 'situation_incorrect'
  | 'situation_partially_correct'
  // Swipe training
  | 'swipe_confirm'
  | 'swipe_deny'
  // Analysis feedback
  | 'analysis_useful'
  | 'analysis_not_useful'
  // PDF/Situation actions
  | 'pdf_situation_validated'
  | 'pdf_situation_rejected'
  | 'pdf_violation_confirmed'
  | 'pdf_violation_rejected';

export type EntityType = 
  | 'email' 
  | 'incident' 
  | 'situation' 
  | 'analysis' 
  | 'swipe_pair'
  | 'pdf_situation'
  | 'pdf_violation';

interface TrackingPayload {
  entityType: EntityType;
  entityId: string;
  feedbackType: FeedbackType;
  originalDetection?: any;
  userCorrection?: any;
  notes?: string;
}

/**
 * Hook pour tracker les actions utilisateur afin d'entraîner l'IA
 * 
 * Tables utilisées:
 * - ai_training_feedback: Feedback général sur les détections IA
 * - ai_situation_training: Situations/violations détectées pour validation
 * - swipe_training_pairs: Paires d'emails pour entraînement swipe
 * - active_learning_queue: File des cas incertains à valider
 */
export function useAITrainingTracker() {
  const { user } = useAuth();

  const trackAction = useCallback(async (payload: TrackingPayload) => {
    if (!user) {
      console.warn('useAITrainingTracker: No user logged in');
      return { success: false, error: 'No user' };
    }

    try {
      const { error } = await supabase
        .from('ai_training_feedback')
        .insert({
          user_id: user.id,
          entity_type: payload.entityType,
          entity_id: payload.entityId,
          feedback_type: payload.feedbackType,
          original_detection: payload.originalDetection || null,
          user_correction: payload.userCorrection || null,
          notes: payload.notes || null,
          used_for_training: false
        });

      if (error) {
        console.error('Error tracking AI feedback:', error);
        return { success: false, error: error.message };
      }

      console.log(`AI Training tracked: ${payload.feedbackType} on ${payload.entityType}:${payload.entityId}`);
      return { success: true };
    } catch (err) {
      console.error('Exception tracking AI feedback:', err);
      return { success: false, error: String(err) };
    }
  }, [user]);

  // ============================================================
  // Raccourcis pour les actions EMAIL
  // ============================================================
  
  const trackEmailDeleted = useCallback((emailId: string, emailData?: any) => {
    return trackAction({
      entityType: 'email',
      entityId: emailId,
      feedbackType: 'email_deleted',
      originalDetection: emailData?.ai_analysis || null,
      notes: `Subject: ${emailData?.subject || 'Unknown'}`
    });
  }, [trackAction]);

  const trackEmailMarkedImportant = useCallback((emailId: string, emailData?: any) => {
    return trackAction({
      entityType: 'email',
      entityId: emailId,
      feedbackType: 'email_marked_important',
      originalDetection: emailData?.ai_analysis || null
    });
  }, [trackAction]);

  // ============================================================
  // Raccourcis pour les actions INCIDENT
  // ============================================================
  
  const trackIncidentModified = useCallback((incidentId: string, oldData: any, newData: any) => {
    return trackAction({
      entityType: 'incident',
      entityId: incidentId,
      feedbackType: 'incident_modified',
      originalDetection: oldData,
      userCorrection: newData,
      notes: `Modified fields: ${Object.keys(newData).filter(k => oldData[k] !== newData[k]).join(', ')}`
    });
  }, [trackAction]);

  const trackIncidentDeleted = useCallback((incidentId: string, incidentData?: any) => {
    return trackAction({
      entityType: 'incident',
      entityId: incidentId,
      feedbackType: 'incident_deleted',
      originalDetection: incidentData,
      notes: `Titre: ${incidentData?.titre || 'Unknown'}`
    });
  }, [trackAction]);

  // ============================================================
  // Raccourcis pour les ANALYSES
  // ============================================================
  
  const trackAnalysisFeedback = useCallback((emailId: string, isUseful: boolean, analysisData?: any) => {
    return trackAction({
      entityType: 'analysis',
      entityId: emailId,
      feedbackType: isUseful ? 'analysis_useful' : 'analysis_not_useful',
      originalDetection: analysisData
    });
  }, [trackAction]);

  // ============================================================
  // Raccourcis pour les SITUATIONS PDF
  // ============================================================
  
  const trackPDFSituationValidated = useCallback((folderId: string, analysisData?: any) => {
    return trackAction({
      entityType: 'pdf_situation',
      entityId: folderId,
      feedbackType: 'pdf_situation_validated',
      originalDetection: analysisData,
      notes: `Score: ${analysisData?.problem_score || 0}/100, Violations: ${analysisData?.violations_detected?.length || 0}`
    });
  }, [trackAction]);

  const trackPDFSituationRejected = useCallback((folderId: string, analysisData?: any, reason?: string) => {
    return trackAction({
      entityType: 'pdf_situation',
      entityId: folderId,
      feedbackType: 'pdf_situation_rejected',
      originalDetection: analysisData,
      notes: reason || 'Analyse rejetée par l\'utilisateur'
    });
  }, [trackAction]);

  const trackPDFViolationFeedback = useCallback((
    folderId: string, 
    violationIndex: number,
    isCorrect: boolean, 
    violationData?: any,
    correction?: string
  ) => {
    return trackAction({
      entityType: 'pdf_violation',
      entityId: `${folderId}:violation_${violationIndex}`,
      feedbackType: isCorrect ? 'pdf_violation_confirmed' : 'pdf_violation_rejected',
      originalDetection: violationData,
      userCorrection: correction ? { correction } : null,
      notes: `Type: ${violationData?.type || 'Unknown'}, Severity: ${violationData?.severity || 'Unknown'}`
    });
  }, [trackAction]);

  return {
    trackAction,
    // Email
    trackEmailDeleted,
    trackEmailMarkedImportant,
    // Incident
    trackIncidentModified,
    trackIncidentDeleted,
    // Analysis
    trackAnalysisFeedback,
    // PDF Situations
    trackPDFSituationValidated,
    trackPDFSituationRejected,
    trackPDFViolationFeedback
  };
}
