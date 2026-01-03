/**
 * Training Data Module - DB-FIRST AI Training Feedback Loop
 * 
 * Ce module récupère les données d'entraînement validées par les utilisateurs
 * pour enrichir les prompts IA et éviter les hallucinations.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface TrainingExample {
  id: string;
  situation_summary: string;
  detected_violation_type: string | null;
  user_correction: string | null;
  correction_notes: string | null;
  ai_confidence: number | null;
  validation_status: string;
  training_priority: number | null;
}

export interface SwipeTrainingResult {
  id: string;
  user_decision: string;
  relationship_type: string;
  manual_notes: string | null;
  email_1_subject?: string;
  email_2_subject?: string;
}

export interface FalsePositiveExample {
  id: string;
  original_detection: any;
  user_correction: any;
  notes: string | null;
  feedback_type: string;
}

/**
 * Récupère les exemples validés et corrigés pour enrichir les prompts IA
 * @param supabase - Client Supabase
 * @param userId - ID de l'utilisateur (optionnel, pour exemples spécifiques)
 * @param limit - Nombre max d'exemples à récupérer
 */
export async function getValidatedTrainingExamples(
  supabase: SupabaseClient,
  userId?: string,
  limit: number = 10
): Promise<TrainingExample[]> {
  try {
    let query = supabase
      .from('ai_situation_training')
      .select('id, situation_summary, detected_violation_type, user_correction, correction_notes, ai_confidence, validation_status, training_priority')
      .in('validation_status', ['validated', 'corrected'])
      .order('training_priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[training] Error fetching validated examples:', error);
      return [];
    }

    // Marquer les exemples comme utilisés pour l'entraînement
    if (data && data.length > 0) {
      const ids = data.map(d => d.id);
      await supabase
        .from('ai_situation_training')
        .update({ is_used_for_training: true, trained_at: new Date().toISOString() })
        .in('id', ids);
    }

    return (data || []) as TrainingExample[];
  } catch (e) {
    console.error('[training] Exception fetching training examples:', e);
    return [];
  }
}

/**
 * Récupère les faux positifs pour que l'IA apprenne à les éviter
 * @param supabase - Client Supabase
 * @param limit - Nombre max d'exemples
 */
export async function getFalsePositiveExamples(
  supabase: SupabaseClient,
  limit: number = 10
): Promise<FalsePositiveExample[]> {
  try {
    const { data, error } = await supabase
      .from('ai_training_feedback')
      .select('id, original_detection, user_correction, notes, feedback_type')
      .in('feedback_type', ['false_positive', 'low_importance'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[training] Error fetching false positives:', error);
      return [];
    }

    // Marquer comme utilisés
    if (data && data.length > 0) {
      const ids = data.map(d => d.id);
      await supabase
        .from('ai_training_feedback')
        .update({ used_for_training: true })
        .in('id', ids);
    }

    return (data || []) as FalsePositiveExample[];
  } catch (e) {
    console.error('[training] Exception fetching false positives:', e);
    return [];
  }
}

/**
 * Récupère les préférences de priorité apprises via SwipeTraining
 * @param supabase - Client Supabase
 * @param userId - ID de l'utilisateur
 * @param limit - Nombre max de résultats
 */
export async function getSwipeTrainingInsights(
  supabase: SupabaseClient,
  userId?: string,
  limit: number = 20
): Promise<{ priorityKeywords: string[], linkedPatterns: string[] }> {
  try {
    let query = supabase
      .from('swipe_training_results')
      .select(`
        id, user_decision, relationship_type, manual_notes,
        swipe_training_pairs!inner(keywords_overlap, actors_overlap, pair_type)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[training] Error fetching swipe insights:', error);
      return { priorityKeywords: [], linkedPatterns: [] };
    }

    // Extraire les patterns de priorité et de liens
    const priorityKeywords: string[] = [];
    const linkedPatterns: string[] = [];

    for (const result of data || []) {
      const pair = result.swipe_training_pairs as any;
      if (!pair) continue;

      const keywords = pair.keywords_overlap || [];
      
      if (result.user_decision === 'email_1_priority' || result.user_decision === 'email_2_priority') {
        priorityKeywords.push(...keywords);
      }
      
      if (result.relationship_type === 'linked' || result.user_decision === 'equal') {
        linkedPatterns.push(...keywords);
      }
    }

    return {
      priorityKeywords: [...new Set(priorityKeywords)].slice(0, 20),
      linkedPatterns: [...new Set(linkedPatterns)].slice(0, 20)
    };
  } catch (e) {
    console.error('[training] Exception fetching swipe insights:', e);
    return { priorityKeywords: [], linkedPatterns: [] };
  }
}

/**
 * Génère un contexte de prompt basé sur les données d'entraînement
 * À injecter dans les prompts système des fonctions IA
 */
export async function buildTrainingPromptContext(
  supabase: SupabaseClient,
  userId?: string
): Promise<string> {
  const [validatedExamples, falsePositives, swipeInsights] = await Promise.all([
    getValidatedTrainingExamples(supabase, userId, 5),
    getFalsePositiveExamples(supabase, 5),
    getSwipeTrainingInsights(supabase, userId, 10)
  ]);

  const sections: string[] = [];

  // Section: Exemples validés (bons exemples)
  if (validatedExamples.length > 0) {
    const examples = validatedExamples.map((ex, i) => {
      const correction = ex.validation_status === 'corrected' 
        ? ` → Corrigé en: ${ex.user_correction || ex.correction_notes || 'N/A'}` 
        : ' → Validé';
      return `${i + 1}. "${ex.situation_summary?.slice(0, 150)}..." [Type: ${ex.detected_violation_type || 'N/A'}]${correction}`;
    }).join('\n');

    sections.push(`EXEMPLES VALIDÉS PAR L'UTILISATEUR (à utiliser comme référence):
${examples}`);
  }

  // Section: Faux positifs (à éviter)
  if (falsePositives.length > 0) {
    const fps = falsePositives.map((fp, i) => {
      const title = fp.original_detection?.suggested_title || fp.original_detection?.title || 'Sans titre';
      const reason = fp.notes || fp.user_correction?.reason || 'Non spécifié';
      return `${i + 1}. "${title}" - Rejeté car: ${reason}`;
    }).join('\n');

    sections.push(`FAUX POSITIFS À ÉVITER (l'utilisateur a rejeté ces détections):
${fps}`);
  }

  // Section: Patterns de priorité
  if (swipeInsights.priorityKeywords.length > 0) {
    sections.push(`MOTS-CLÉS PRIORITAIRES (l'utilisateur considère ces sujets comme urgents):
${swipeInsights.priorityKeywords.join(', ')}`);
  }

  if (sections.length === 0) {
    return ''; // Pas de contexte d'entraînement disponible
  }

  return `
=== APPRENTISSAGE UTILISATEUR ===
Les exemples suivants sont basés sur les validations et corrections de l'utilisateur.
Utilise ces informations pour améliorer tes analyses.

${sections.join('\n\n')}

=== FIN APPRENTISSAGE ===
`;
}

/**
 * Enregistre un nouveau cas d'entraînement depuis une analyse IA
 */
export async function recordTrainingCase(
  supabase: SupabaseClient,
  params: {
    userId: string;
    emailId?: string;
    incidentId?: string;
    situationSummary: string;
    detectedViolationType?: string;
    detectedLegalRefs?: any[];
    aiConfidence?: number;
    aiReasoning?: string;
    trainingPriority?: number;
  }
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('ai_situation_training')
      .insert({
        user_id: params.userId,
        email_id: params.emailId || null,
        incident_id: params.incidentId || null,
        situation_summary: params.situationSummary,
        detected_violation_type: params.detectedViolationType || null,
        detected_legal_refs: params.detectedLegalRefs || [],
        ai_confidence: params.aiConfidence || null,
        ai_reasoning: params.aiReasoning || null,
        validation_status: 'pending',
        training_priority: params.trainingPriority || 5,
        is_used_for_training: false
      })
      .select('id')
      .single();

    if (error) {
      console.error('[training] Error recording training case:', error);
      return null;
    }

    return data?.id || null;
  } catch (e) {
    console.error('[training] Exception recording training case:', e);
    return null;
  }
}
