import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Scale,
  Mail,
  FileText,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  PenLine,
  BookOpen
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TrainingStats {
  totalFeedbacks: number;
  byType: Record<string, number>;
  byEntityType: Record<string, number>;
  recentFeedbacks: any[];
  swipeStats: {
    total: number;
    correct: number;
    incorrect: number;
  };
  situationStats: {
    total: number;
    correct: number;
    incorrect: number;
    pending: number;
  };
  legalRefsStats: {
    total: number;
    verified: number;
  };
}

export default function TrainingDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    if (!user) return;
    
    try {
      // Charger les feedbacks
      const { data: feedbacks, error: feedbacksError } = await supabase
        .from('ai_training_feedback')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (feedbacksError) throw feedbacksError;

      // Charger les swipe results
      const { data: swipeResults, error: swipeError } = await supabase
        .from('swipe_training_results')
        .select('*, swipe_training_pairs(ai_prediction)')
        .eq('user_id', user.id);

      if (swipeError) throw swipeError;

      // Charger les situations
      const { data: situations, error: situationsError } = await supabase
        .from('ai_situation_training')
        .select('*')
        .eq('user_id', user.id);

      if (situationsError) throw situationsError;

      // Charger les références légales
      const { data: legalRefs, error: legalError } = await supabase
        .from('legal_references')
        .select('*')
        .eq('user_id', user.id);

      if (legalError) throw legalError;

      // Calculer les stats
      const byType: Record<string, number> = {};
      const byEntityType: Record<string, number> = {};

      (feedbacks || []).forEach((f: any) => {
        byType[f.feedback_type] = (byType[f.feedback_type] || 0) + 1;
        byEntityType[f.entity_type] = (byEntityType[f.entity_type] || 0) + 1;
      });

      // Calculer précision swipe
      let swipeCorrect = 0;
      (swipeResults || []).forEach((r: any) => {
        const prediction = r.swipe_training_pairs?.ai_prediction;
        if (prediction && r.relationship_type === prediction) {
          swipeCorrect++;
        }
      });

      setStats({
        totalFeedbacks: feedbacks?.length || 0,
        byType,
        byEntityType,
        recentFeedbacks: (feedbacks || []).slice(0, 20),
        swipeStats: {
          total: swipeResults?.length || 0,
          correct: swipeCorrect,
          incorrect: (swipeResults?.length || 0) - swipeCorrect
        },
        situationStats: {
          total: situations?.length || 0,
          correct: situations?.filter((s: any) => s.validation_status === 'correct').length || 0,
          incorrect: situations?.filter((s: any) => s.validation_status === 'incorrect').length || 0,
          pending: situations?.filter((s: any) => s.validation_status === 'pending').length || 0
        },
        legalRefsStats: {
          total: legalRefs?.length || 0,
          verified: legalRefs?.filter((r: any) => r.is_verified).length || 0
        }
      });
    } catch (error) {
      console.error('Error loading training stats:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
  };

  const getFeedbackIcon = (type: string) => {
    switch (type) {
      case 'email_deleted': return <Trash2 className="h-4 w-4 text-destructive" />;
      case 'email_marked_important': return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'incident_modified': return <PenLine className="h-4 w-4 text-blue-500" />;
      case 'incident_deleted': return <Trash2 className="h-4 w-4 text-destructive" />;
      case 'situation_correct': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'situation_incorrect': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'swipe_confirm': return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'swipe_deny': return <ThumbsDown className="h-4 w-4 text-destructive" />;
      case 'analysis_useful': return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'analysis_not_useful': return <ThumbsDown className="h-4 w-4 text-destructive" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getFeedbackLabel = (type: string) => {
    const labels: Record<string, string> = {
      'email_deleted': 'Email supprimé',
      'email_marked_important': 'Email important',
      'email_archived': 'Email archivé',
      'incident_created': 'Incident créé',
      'incident_modified': 'Incident modifié',
      'incident_deleted': 'Incident supprimé',
      'situation_correct': 'Situation correcte',
      'situation_incorrect': 'Situation incorrecte',
      'swipe_confirm': 'Swipe confirmé',
      'swipe_deny': 'Swipe rejeté',
      'analysis_useful': 'Analyse utile',
      'analysis_not_useful': 'Analyse inutile'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const accuracyRate = stats?.situationStats.total 
    ? Math.round((stats.situationStats.correct / (stats.situationStats.correct + stats.situationStats.incorrect || 1)) * 100)
    : 0;

  const swipeAccuracy = stats?.swipeStats.total
    ? Math.round((stats.swipeStats.correct / stats.swipeStats.total) * 100)
    : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard d'Entraînement IA"
          description="Suivez l'impact de vos actions sur l'amélioration de l'IA"
          icon={<Brain className="h-6 w-6" />}
          actions={
            <Button onClick={handleRefresh} disabled={refreshing} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          }
        />

        {/* KPIs principaux */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Feedbacks</CardTitle>
              <Brain className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalFeedbacks || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Actions enregistrées pour l'IA
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Précision Situations</CardTitle>
              <Target className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{accuracyRate}%</div>
              <Progress value={accuracyRate} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.situationStats.correct || 0} correctes / {(stats?.situationStats.correct || 0) + (stats?.situationStats.incorrect || 0)} validées
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Précision Swipes</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{swipeAccuracy}%</div>
              <Progress value={swipeAccuracy} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.swipeStats.total || 0} swipes effectués
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Références Légales</CardTitle>
              <Scale className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.legalRefsStats.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-600">{stats?.legalRefsStats.verified || 0} vérifiées</span>
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="glass-card">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="feedbacks">Historique</TabsTrigger>
            <TabsTrigger value="recommendations">Recommandations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Par type de feedback */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Répartition par type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats?.byType || {}).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getFeedbackIcon(type)}
                          <span className="text-sm">{getFeedbackLabel(type)}</span>
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                    {Object.keys(stats?.byType || {}).length === 0 && (
                      <p className="text-muted-foreground text-sm text-center py-4">
                        Aucun feedback enregistré
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Par entité */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Répartition par entité</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats?.byEntityType || {}).map(([entity, count]) => (
                      <div key={entity} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {entity === 'email' && <Mail className="h-4 w-4 text-blue-500" />}
                          {entity === 'incident' && <FileText className="h-4 w-4 text-orange-500" />}
                          {entity === 'situation' && <BookOpen className="h-4 w-4 text-purple-500" />}
                          {entity === 'analysis' && <Brain className="h-4 w-4 text-green-500" />}
                          <span className="text-sm capitalize">{entity}</span>
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                    {Object.keys(stats?.byEntityType || {}).length === 0 && (
                      <p className="text-muted-foreground text-sm text-center py-4">
                        Aucun feedback enregistré
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Statut des situations */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Statut des validations de situations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold">{stats?.situationStats.total || 0}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-green-500/10">
                    <div className="text-2xl font-bold text-green-600">{stats?.situationStats.correct || 0}</div>
                    <div className="text-xs text-muted-foreground">Correctes</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-red-500/10">
                    <div className="text-2xl font-bold text-red-600">{stats?.situationStats.incorrect || 0}</div>
                    <div className="text-xs text-muted-foreground">Incorrectes</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-yellow-500/10">
                    <div className="text-2xl font-bold text-yellow-600">{stats?.situationStats.pending || 0}</div>
                    <div className="text-xs text-muted-foreground">En attente</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedbacks">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Historique des feedbacks récents</CardTitle>
                <CardDescription>Les 20 dernières actions enregistrées</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {(stats?.recentFeedbacks || []).map((feedback: any) => (
                      <div 
                        key={feedback.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {getFeedbackIcon(feedback.feedback_type)}
                          <div>
                            <div className="text-sm font-medium">{getFeedbackLabel(feedback.feedback_type)}</div>
                            <div className="text-xs text-muted-foreground">
                              {feedback.entity_type} • {feedback.notes?.slice(0, 50) || 'Sans notes'}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(feedback.created_at), 'dd MMM HH:mm', { locale: fr })}
                        </div>
                      </div>
                    ))}
                    {(stats?.recentFeedbacks || []).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aucun feedback enregistré</p>
                        <p className="text-sm mt-1">Vos actions seront enregistrées ici</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Recommandations pour améliorer l'IA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(stats?.situationStats.pending || 0) > 0 && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Validez les situations en attente</p>
                        <p className="text-sm text-muted-foreground">
                          Vous avez {stats?.situationStats.pending} situations à valider. 
                          Allez dans "Entraînement IA" pour les traiter.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {(stats?.swipeStats.total || 0) < 10 && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Faites plus de swipes</p>
                        <p className="text-sm text-muted-foreground">
                          Le mode swipe aide l'IA à comprendre les relations entre emails.
                          Vous n'avez fait que {stats?.swipeStats.total} swipes.
                        </p>
                      </div>
                    </div>
                  )}

                  {(stats?.legalRefsStats.verified || 0) < (stats?.legalRefsStats.total || 0) && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <Scale className="h-5 w-5 text-purple-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Vérifiez les références légales</p>
                        <p className="text-sm text-muted-foreground">
                          {(stats?.legalRefsStats.total || 0) - (stats?.legalRefsStats.verified || 0)} références légales 
                          n'ont pas encore été vérifiées.
                        </p>
                      </div>
                    </div>
                  )}

                  {(stats?.totalFeedbacks || 0) === 0 && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-muted border border-border">
                      <Brain className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Commencez à entraîner l'IA</p>
                        <p className="text-sm text-muted-foreground">
                          Chaque action que vous faites (supprimer un email non pertinent, 
                          modifier un incident, valider une situation) aide l'IA à s'améliorer.
                        </p>
                      </div>
                    </div>
                  )}

                  {(stats?.totalFeedbacks || 0) >= 50 && accuracyRate >= 80 && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Excellent travail !</p>
                        <p className="text-sm text-muted-foreground">
                          L'IA a suffisamment de données pour fonctionner efficacement.
                          Continuez à valider les nouvelles détections.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
