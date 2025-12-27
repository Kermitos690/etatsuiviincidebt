import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type FeedbackType = 
  | 'email_deleted' 
  | 'email_marked_important' 
  | 'email_archived'
  | 'incident_created'
  | 'incident_modified'
  | 'incident_deleted'
  | 'situation_correct'
  | 'situation_incorrect'
  | 'swipe_confirm'
  | 'swipe_deny'
  | 'analysis_useful'
  | 'analysis_not_useful';

interface TrackingPayload {
  entityType: 'email' | 'incident' | 'situation' | 'analysis' | 'swipe_pair';
  entityId: string;
  feedbackType: FeedbackType;
  originalDetection?: any;
  userCorrection?: any;
  notes?: string;
}

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

  // Raccourcis pour les actions communes
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

  const trackAnalysisFeedback = useCallback((emailId: string, isUseful: boolean, analysisData?: any) => {
    return trackAction({
      entityType: 'analysis',
      entityId: emailId,
      feedbackType: isUseful ? 'analysis_useful' : 'analysis_not_useful',
      originalDetection: analysisData
    });
  }, [trackAction]);

  return {
    trackAction,
    trackEmailDeleted,
    trackEmailMarkedImportant,
    trackIncidentModified,
    trackIncidentDeleted,
    trackAnalysisFeedback
  };
}
