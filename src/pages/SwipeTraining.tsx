import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Link2, 
  Loader2, 
  Trophy,
  Flame,
  Star,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TrainingPair {
  id: string;
  email_1_id: string;
  email_2_id: string;
  pair_type: string;
  ai_prediction: string | null;
  ai_confidence: number | null;
  context_summary: string | null;
  keywords_overlap: string[];
  actors_overlap: string[];
  priority_score: number;
}

interface Email {
  id: string;
  sender: string;
  subject: string;
  body: string;
  received_at: string;
}

interface UserStats {
  total_swipes: number;
  current_streak: number;
  max_streak: number;
  correct_predictions: number;
  badges: any[];
}

export default function SwipeTraining() {
  const [pairs, setPairs] = useState<TrainingPair[]>([]);
  const [currentPair, setCurrentPair] = useState<TrainingPair | null>(null);
  const [email1, setEmail1] = useState<Email | null>(null);
  const [email2, setEmail2] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingPairs, setGeneratingPairs] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [notes, setNotes] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);

  const generatePairs = async () => {
    setGeneratingPairs(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-training-pairs', {
        body: { limit: 20 }
      });

      if (error) throw error;

      toast.success(`${data?.generated || 0} nouvelles paires générées`);
      await fetchPairsAndStats();
    } catch (err) {
      console.error('Error generating pairs:', err);
      toast.error('Erreur lors de la génération des paires');
    } finally {
      setGeneratingPairs(false);
    }
  };

  useEffect(() => {
    fetchPairsAndStats();
    checkFirstVisit();
  }, []);

  const checkFirstVisit = async () => {
    const visited = localStorage.getItem('swipe-training-visited');
    if (!visited) {
      setShowTutorial(true);
      localStorage.setItem('swipe-training-visited', 'true');
    }
  };

  const fetchPairsAndStats = async () => {
    setLoading(true);
    try {
      // Fetch unprocessed pairs
      const { data: pairsData, error: pairsError } = await supabase
        .from('swipe_training_pairs')
        .select('*')
        .eq('is_processed', false)
        .order('priority_score', { ascending: false })
        .limit(20);

      if (pairsError) throw pairsError;
      setPairs((pairsData || []) as TrainingPair[]);

      // Fetch user stats
      const { data: statsData } = await supabase
        .from('swipe_training_stats')
        .select('*')
        .single();

      if (statsData) {
        setStats(statsData as UserStats);
      }

      // Load first pair
      if (pairsData && pairsData.length > 0) {
        await loadPairEmails(pairsData[0] as TrainingPair);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadPairEmails = async (pair: TrainingPair) => {
    setCurrentPair(pair);
    setStartTime(Date.now());
    setNotes('');

    try {
      const [email1Res, email2Res] = await Promise.all([
        supabase.from('emails').select('*').eq('id', pair.email_1_id).single(),
        supabase.from('emails').select('*').eq('id', pair.email_2_id).single(),
      ]);

      setEmail1(email1Res.data as Email);
      setEmail2(email2Res.data as Email);
    } catch (err) {
      console.error('Error loading emails:', err);
    }
  };

  const handleSwipe = async (decision: 'left' | 'right' | 'related') => {
    if (!currentPair) return;
    setSaving(true);

    const timeSpent = Date.now() - startTime;

    try {
      // Record result
      const { error: resultError } = await supabase
        .from('swipe_training_results')
        .insert({
          pair_id: currentPair.id,
          user_decision: decision === 'left' ? 'email_1_priority' : decision === 'right' ? 'email_2_priority' : 'equal',
          swipe_direction: decision,
          relationship_type: decision === 'related' ? 'linked' : 'compared',
          manual_notes: notes || null,
          time_spent_ms: timeSpent,
        });

      if (resultError) throw resultError;

      // Mark pair as processed
      await supabase
        .from('swipe_training_pairs')
        .update({ is_processed: true })
        .eq('id', currentPair.id);

      // Update stats
      await updateStats();

      // Load next pair
      const remainingPairs = pairs.filter(p => p.id !== currentPair.id);
      setPairs(remainingPairs);

      if (remainingPairs.length > 0) {
        await loadPairEmails(remainingPairs[0]);
      } else {
        setCurrentPair(null);
        setEmail1(null);
        setEmail2(null);
      }

      toast.success(
        decision === 'left' ? 'Email 1 plus prioritaire' :
        decision === 'right' ? 'Email 2 plus prioritaire' :
        'Emails liés'
      );
    } catch (err) {
      console.error('Error saving:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const updateStats = async () => {
    try {
      const { data: currentStats } = await supabase
        .from('swipe_training_stats')
        .select('*')
        .single();

      if (currentStats) {
        const newStreak = (currentStats.current_streak || 0) + 1;
        await supabase
          .from('swipe_training_stats')
          .update({
            total_swipes: (currentStats.total_swipes || 0) + 1,
            current_streak: newStreak,
            max_streak: Math.max(newStreak, currentStats.max_streak || 0),
            last_active_at: new Date().toISOString(),
          })
          .eq('id', currentStats.id);

        setStats({
          ...currentStats,
          total_swipes: (currentStats.total_swipes || 0) + 1,
          current_streak: newStreak,
          max_streak: Math.max(newStreak, currentStats.max_streak || 0),
        } as UserStats);
      } else {
        // Create new stats record
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('swipe_training_stats').insert({
            user_id: user.id,
            total_swipes: 1,
            current_streak: 1,
            max_streak: 1,
          });
        }
      }
    } catch (err) {
      console.error('Error updating stats:', err);
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6">
          <PageHeader 
            title="Swipe Training" 
            description="Entraînez l'IA par comparaison"
          />
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <PageHeader 
            title="Swipe Training" 
            description="Comparez les emails pour entraîner l'IA"
          />
          <Button variant="ghost" size="icon" onClick={() => setShowTutorial(true)}>
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="flex items-center gap-4 mb-6 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span className="font-medium">{stats.total_swipes}</span>
              <span className="text-sm text-muted-foreground">total</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="font-medium">{stats.current_streak}</span>
              <span className="text-sm text-muted-foreground">streak</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-purple-500" />
              <span className="font-medium">{stats.max_streak}</span>
              <span className="text-sm text-muted-foreground">record</span>
            </div>
            <Progress 
              value={Math.min((stats.current_streak / 10) * 100, 100)} 
              className="flex-1 h-2"
            />
          </div>
        )}

        {!currentPair || !email1 || !email2 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
              <h3 className="font-medium text-lg mb-2">
                {pairs.length === 0 ? 'Aucune paire disponible' : 'Session terminée !'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {pairs.length === 0 
                  ? 'Générez des paires d\'emails pour commencer l\'entraînement.'
                  : 'Plus de paires à comparer pour le moment.'
                }
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={generatePairs} disabled={generatingPairs}>
                  {generatingPairs ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Star className="h-4 w-4 mr-2" />
                  )}
                  Générer des paires
                </Button>
                <Button variant="outline" onClick={fetchPairsAndStats}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Rafraîchir
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Context */}
            {currentPair.context_summary && (
              <Card className="mb-4">
                <CardContent className="py-3">
                  <p className="text-sm text-muted-foreground">
                    <strong>Contexte:</strong> {currentPair.context_summary}
                  </p>
                  {currentPair.keywords_overlap?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {currentPair.keywords_overlap.map((kw, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Email Cards Side by Side */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {/* Email 1 */}
              <Card className="border-2 border-blue-200 dark:border-blue-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20">
                      Email 1
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(email1.received_at), 'd MMM yyyy', { locale: fr })}
                    </span>
                  </div>
                  <CardTitle className="text-sm">{truncateText(email1.subject, 60)}</CardTitle>
                  <p className="text-xs text-muted-foreground">{email1.sender}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {truncateText(email1.body, 500)}
                  </p>
                </CardContent>
              </Card>

              {/* Email 2 */}
              <Card className="border-2 border-green-200 dark:border-green-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20">
                      Email 2
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(email2.received_at), 'd MMM yyyy', { locale: fr })}
                    </span>
                  </div>
                  <CardTitle className="text-sm">{truncateText(email2.subject, 60)}</CardTitle>
                  <p className="text-xs text-muted-foreground">{email2.sender}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {truncateText(email2.body, 500)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes optionnelles sur cette comparaison..."
                rows={2}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-4">
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleSwipe('left')}
                disabled={saving}
                className="flex-1 md:flex-none border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Email 1 prioritaire
              </Button>
              
              <Button
                size="lg"
                variant="secondary"
                onClick={() => handleSwipe('related')}
                disabled={saving}
              >
                <Link2 className="h-5 w-5 mr-2" />
                Liés
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleSwipe('right')}
                disabled={saving}
                className="flex-1 md:flex-none border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                Email 2 prioritaire
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>

            {/* Remaining count */}
            <p className="text-center text-sm text-muted-foreground mt-4">
              {pairs.length} paires restantes dans cette session
            </p>
          </>
        )}

        {/* Tutorial Dialog */}
        <Dialog open={showTutorial} onOpenChange={setShowTutorial}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Comment ça marche ?</DialogTitle>
              <DialogDescription>
                Entraînez l'IA en comparant des paires d'emails
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <ArrowLeft className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Email 1 prioritaire</p>
                  <p className="text-sm text-muted-foreground">
                    L'email de gauche est plus urgent/important
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Email 2 prioritaire</p>
                  <p className="text-sm text-muted-foreground">
                    L'email de droite est plus urgent/important
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Link2 className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Emails liés</p>
                  <p className="text-sm text-muted-foreground">
                    Ces emails font partie du même sujet/affaire
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm">
                  <strong>Astuce:</strong> Regardez la date, l'expéditeur, et le contenu pour 
                  déterminer lequel nécessite une action plus urgente.
                </p>
              </div>
            </div>
            <Button onClick={() => setShowTutorial(false)} className="w-full">
              Compris, c'est parti !
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
