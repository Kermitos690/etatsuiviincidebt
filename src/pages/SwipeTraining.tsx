import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SwipeCard } from '@/components/training/SwipeCard';
import { SwipeStats } from '@/components/training/SwipeStats';
import { AIEnrichPanel } from '@/components/training/AIEnrichPanel';
import { SwipeDirection } from '@/hooks/useSwipeGesture';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { RefreshCw, Sparkles, GraduationCap, Loader2 } from 'lucide-react';

interface TrainingPair {
  id: string;
  email_1_id: string;
  email_2_id: string;
  pair_type: string;
  ai_prediction: string | null;
  ai_confidence: number | null;
  ai_enrichment: any;
  keywords_overlap: string[];
  actors_overlap: string[];
  email_1?: any;
  email_2?: any;
}

interface UserStats {
  total_swipes: number;
  current_streak: number;
  max_streak: number;
  correct_predictions: number;
  badges: any[];
}

export default function SwipeTraining() {
  const { user } = useAuth();
  const [pairs, setPairs] = useState<TrainingPair[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState<UserStats>({
    total_swipes: 0,
    current_streak: 0,
    max_streak: 0,
    correct_predictions: 0,
    badges: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [currentEnrichment, setCurrentEnrichment] = useState<any>(null);

  const currentPair = pairs[currentIndex];

  // Charger les paires et stats
  const loadData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Charger les paires non traitées
      const { data: pairsData, error: pairsError } = await supabase
        .from('swipe_training_pairs')
        .select('*')
        .eq('is_processed', false)
        .order('priority_score', { ascending: false })
        .limit(20);

      if (pairsError) throw pairsError;

      if (pairsData && pairsData.length > 0) {
        // Charger les emails pour chaque paire
        const emailIds = new Set<string>();
        pairsData.forEach(p => {
          emailIds.add(p.email_1_id);
          emailIds.add(p.email_2_id);
        });

        const { data: emails, error: emailsError } = await supabase
          .from('emails')
          .select('id, subject, sender, recipient, body, received_at')
          .in('id', Array.from(emailIds));

        if (emailsError) throw emailsError;

        const emailMap = new Map(emails?.map(e => [e.id, e]) || []);

        const enrichedPairs = pairsData.map(p => ({
          ...p,
          email_1: emailMap.get(p.email_1_id),
          email_2: emailMap.get(p.email_2_id),
        }));

        setPairs(enrichedPairs);
      } else {
        setPairs([]);
      }

      // Charger les stats utilisateur
      const { data: statsData } = await supabase
        .from('swipe_training_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (statsData) {
        setStats({
          total_swipes: statsData.total_swipes || 0,
          current_streak: statsData.current_streak || 0,
          max_streak: statsData.max_streak || 0,
          correct_predictions: statsData.correct_predictions || 0,
          badges: Array.isArray(statsData.badges) ? statsData.badges : [],
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Générer de nouvelles paires
  const generatePairs = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-training-pairs', {
        body: { limit: 50, regenerate: pairs.length === 0 }
      });

      if (error) throw error;

      toast.success(`${data.pairs_generated} nouvelles paires générées`);
      await loadData();
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error generating pairs:', error);
      toast.error('Erreur lors de la génération des paires');
    } finally {
      setIsGenerating(false);
    }
  };

  // Enrichir avec IA
  const enrichWithAI = async () => {
    if (!currentPair) return;

    setIsEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-enrich-context', {
        body: {
          pair_id: currentPair.id,
          email_1: currentPair.email_1,
          email_2: currentPair.email_2,
        }
      });

      if (error) throw error;

      setCurrentEnrichment(data.enrichment);
      toast.success('Analyse IA terminée');
    } catch (error) {
      console.error('Error enriching:', error);
      toast.error('Erreur lors de l\'analyse IA');
    } finally {
      setIsEnriching(false);
    }
  };

  // Gérer le swipe
  const handleSwipe = async (direction: SwipeDirection) => {
    if (!currentPair || !user) return;

    const decisionMap: Record<string, { decision: string; relationship: string | null }> = {
      right: { decision: 'confirm', relationship: 'corroboration' },
      left: { decision: 'deny', relationship: 'unrelated' },
      up: { decision: 'need_more', relationship: null },
      down: { decision: 'spam', relationship: null },
    };

    const { decision, relationship } = decisionMap[direction!] || { decision: 'manual', relationship: null };

    // Si swipe up, enrichir avec IA
    if (direction === 'up') {
      await enrichWithAI();
      return;
    }

    try {
      // Enregistrer le résultat
      const { error: resultError } = await supabase
        .from('swipe_training_results')
        .insert({
          pair_id: currentPair.id,
          user_id: user.id,
          user_decision: decision,
          swipe_direction: direction,
          relationship_type: relationship,
          ai_analysis: currentEnrichment,
        });

      if (resultError) throw resultError;

      // Marquer la paire comme traitée
      await supabase
        .from('swipe_training_pairs')
        .update({ is_processed: true })
        .eq('id', currentPair.id);

      // Mettre à jour les stats
      const isCorrect = currentPair.ai_prediction === relationship;
      const { data: statsData } = await supabase.functions.invoke('update-training-stats', {
        body: { user_id: user.id, action: 'swipe', is_correct: isCorrect }
      });

      if (statsData?.stats) {
        setStats({
          total_swipes: statsData.stats.total_swipes || 0,
          current_streak: statsData.stats.current_streak || 0,
          max_streak: statsData.stats.max_streak || 0,
          correct_predictions: statsData.stats.correct_predictions || 0,
          badges: statsData.stats.badges || [],
        });

        // Afficher les nouveaux badges
        if (statsData.new_badges?.length > 0) {
          statsData.new_badges.forEach((badge: any) => {
            toast.success(`🏆 Badge débloqué: ${badge.icon} ${badge.name}`);
          });
        }
      }

      // Passer à la paire suivante
      setCurrentEnrichment(null);
      if (currentIndex < pairs.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Plus de paires, en générer de nouvelles
        toast.info('Toutes les paires ont été traitées. Génération de nouvelles paires...');
        await generatePairs();
      }

    } catch (error) {
      console.error('Error handling swipe:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Entraînement IA - Mode Swipe"
          description="Validez les connexions entre emails pour améliorer l'IA"
          icon={<GraduationCap className="h-6 w-6" />}
          actions={
            <Button
              onClick={generatePairs}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Générer des paires
            </Button>
          }
        />

        {/* Stats */}
        <SwipeStats
          totalSwipes={stats.total_swipes}
          currentStreak={stats.current_streak}
          maxStreak={stats.max_streak}
          correctPredictions={stats.correct_predictions}
          badges={stats.badges}
          remainingPairs={pairs.length - currentIndex}
        />

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Swipe card */}
          <div className="lg:col-span-2">
            {isLoading ? (
              <Card className="glass-card">
                <CardContent className="p-12 flex flex-col items-center justify-center">
                  <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">Chargement des paires...</p>
                </CardContent>
              </Card>
            ) : currentPair?.email_1 && currentPair?.email_2 ? (
              <SwipeCard
                email1={currentPair.email_1}
                email2={currentPair.email_2}
                aiPrediction={currentPair.ai_prediction || undefined}
                aiConfidence={currentPair.ai_confidence || undefined}
                keywordsOverlap={currentPair.keywords_overlap}
                actorsOverlap={currentPair.actors_overlap}
                onSwipe={handleSwipe}
                onEnrich={enrichWithAI}
                isEnriching={isEnriching}
              />
            ) : (
              <Card className="glass-card">
                <CardContent className="p-12 flex flex-col items-center justify-center">
                  <Sparkles className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucune paire à traiter</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Générez de nouvelles paires d'entraînement pour commencer
                  </p>
                  <Button onClick={generatePairs} disabled={isGenerating} className="gap-2">
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Générer des paires
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* AI Enrichment panel */}
          <div className="lg:col-span-1">
            <AIEnrichPanel 
              enrichment={currentEnrichment || currentPair?.ai_enrichment} 
              isLoading={isEnriching}
            />
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span>⬅️ <kbd className="px-2 py-1 bg-muted rounded">←</kbd> Non lié</span>
              <span>⬇️ <kbd className="px-2 py-1 bg-muted rounded">↓</kbd> Spam</span>
              <span>⬆️ <kbd className="px-2 py-1 bg-muted rounded">↑</kbd> Analyser IA</span>
              <span>➡️ <kbd className="px-2 py-1 bg-muted rounded">→</kbd> Corrobore</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
