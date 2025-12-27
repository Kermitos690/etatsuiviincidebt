import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LegalRef {
  code: string;
  article: string;
  text?: string;
  confidence: number;
  reasoning?: string;
}

interface Situation {
  id: string;
  email_id: string;
  incident_id: string | null;
  situation_summary: string;
  detected_violation_type: string;
  detected_legal_refs: LegalRef[];
  ai_confidence: number;
  ai_reasoning: string;
  validation_status: string;
  user_correction: string | null;
  correct_legal_refs: LegalRef[];
  correction_notes: string | null;
  created_at: string;
  emails?: {
    id: string;
    subject: string;
    sender: string;
    received_at: string;
    body?: string;
  };
}

interface TrainingStats {
  situations: {
    total: number;
    pending: number;
    correct: number;
    incorrect: number;
    needsVerification: number;
    partiallyCorrect: number;
  };
  legalRefs: {
    total: number;
    verified: number;
  };
}

export function useActivelearning() {
  const [situations, setSituations] = useState<Situation[]>([]);
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const fetchPendingSituations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-active-learning', {
        body: { action: 'get-pending-situations', limit: 20 }
      });

      if (error) throw error;
      
      // Map the response to handle the nested email data
      const mappedSituations = (data.situations || []).map((s: any) => ({
        ...s,
        detected_legal_refs: s.detected_legal_refs || [],
        correct_legal_refs: s.correct_legal_refs || []
      }));
      
      setSituations(mappedSituations);
    } catch (err) {
      console.error('Error fetching situations:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les situations',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-active-learning', {
        body: { action: 'get-training-stats' }
      });

      if (error) throw error;
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const generateSituations = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-active-learning', {
        body: { action: 'generate-situations', limit: 10 }
      });

      if (error) throw error;

      toast({
        title: 'Génération terminée',
        description: `${data.generated} nouvelles situations générées`
      });

      await fetchPendingSituations();
      await fetchStats();
    } catch (err) {
      console.error('Error generating situations:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer les situations',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const validateSituation = async (
    situationId: string,
    validationStatus: 'correct' | 'incorrect' | 'needs_verification' | 'partially_correct',
    userCorrection?: string,
    correctLegalRefs?: LegalRef[],
    correctionNotes?: string
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-active-learning', {
        body: {
          action: 'validate-situation',
          situationId,
          validationStatus,
          userCorrection,
          correctLegalRefs,
          correctionNotes
        }
      });

      if (error) throw error;

      // Message différent selon l'action
      if (validationStatus === 'incorrect') {
        toast({
          title: 'Situation supprimée',
          description: 'Hors sujet - L\'IA apprendra à ne plus détecter ce type'
        });
      } else if (validationStatus === 'correct') {
        toast({
          title: 'Détection confirmée',
          description: 'L\'IA est renforcée sur ce type de détection'
        });
      } else {
        toast({
          title: 'Validation enregistrée',
          description: 'Merci pour votre contribution à l\'entraînement'
        });
      }

      // Remove from list (la situation est retirée de la vue dans tous les cas)
      setSituations(prev => prev.filter(s => s.id !== situationId));
      await fetchStats();
    } catch (err) {
      console.error('Error validating situation:', err);
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      toast({
        title: 'Erreur',
        description: `Impossible de valider la situation: ${msg}`,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchPendingSituations();
    fetchStats();
  }, []);

  return {
    situations,
    stats,
    isLoading,
    isGenerating,
    fetchPendingSituations,
    fetchStats,
    generateSituations,
    validateSituation
  };
}
