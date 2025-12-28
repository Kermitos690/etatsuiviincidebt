import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Brain, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Users, 
  TrendingUp,
  TrendingDown,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Shield,
  Target,
  BarChart3,
  RefreshCw,
  GitMerge
} from "lucide-react";

export default function IATraining() {
  const queryClient = useQueryClient();
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [showOnlyWithIssues, setShowOnlyWithIssues] = useState(false);
  // Fetch thread analyses for validation
  const { data: threadAnalyses, isLoading: loadingThreads } = useQuery({
    queryKey: ['thread-analyses-training'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('thread_analyses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    }
  });

  // Fetch actor trust scores
  const { data: actorScores, isLoading: loadingActors } = useQuery({
    queryKey: ['actor-trust-scores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('actor_trust_scores')
        .select('*')
        .order('trust_score', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  // Fetch training feedback stats
  const { data: feedbackStats } = useQuery({
    queryKey: ['training-feedback-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_training_feedback')
        .select('feedback_type');
      if (error) throw error;
      
      const stats = {
        total: data?.length || 0,
        correct: data?.filter(f => f.feedback_type === 'correct').length || 0,
        false_positive: data?.filter(f => f.feedback_type === 'false_positive').length || 0,
        partial: data?.filter(f => f.feedback_type === 'partial').length || 0,
        missed: data?.filter(f => f.feedback_type === 'missed_detection').length || 0,
      };
      
      return {
        ...stats,
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
      };
    }
  });

  // Fetch corroborations
  const { data: corroborations } = useQuery({
    queryKey: ['corroborations-training'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corroborations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    }
  });

  // Submit feedback mutation
  const submitFeedback = useMutation({
    mutationFn: async ({ entityId, entityType, feedbackType, notes }: any) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error('Vous devez être connecté pour enregistrer un feedback.');

      const { error } = await supabase
        .from('ai_training_feedback')
        .insert({
          entity_id: entityId,
          entity_type: entityType,
          feedback_type: feedbackType,
          user_id: user.id,
          notes,
          original_detection: selectedThread,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feedback enregistré");
      queryClient.invalidateQueries({ queryKey: ['thread-analyses-training'] });
      queryClient.invalidateQueries({ queryKey: ['training-feedback-stats'] });
      setSelectedThread(null);
      setFeedbackNotes("");
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error("Erreur lors de l'enregistrement du feedback", { description: msg });
    }
  });

  const handleFeedback = (type: string) => {
    if (!selectedThread) return;
    
    submitFeedback.mutate({
      entityId: selectedThread.id,
      entityType: 'thread_analysis',
      feedbackType: type,
      notes: feedbackNotes,
    });
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 50) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getSeverityColor = (severity?: string | null) => {
    switch (severity?.toLowerCase()) {
      case 'critique': 
      case 'critical': return "destructive";
      case 'haute': 
      case 'high': return "destructive";
      case 'moyenne': 
      case 'medium': return "secondary";
      default: return "outline";
    }
  };

  const threadsWithIssues = threadAnalyses?.filter(t => 
    (t.detected_issues as any[])?.length > 0
  ) || [];

  // Afficher toutes les analyses ou seulement celles avec problèmes
  const displayedThreads = showOnlyWithIssues ? threadsWithIssues : (threadAnalyses || []);

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              Entraînement IA
            </h1>
            <p className="text-muted-foreground mt-1">
              Validez les analyses de threads pour améliorer la précision de l'IA
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Précision IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{feedbackStats?.accuracy || 0}%</div>
              <Progress value={feedbackStats?.accuracy || 0} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {feedbackStats?.total || 0} analyses évaluées
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Analyses correctes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{feedbackStats?.correct || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Confirmées par l'utilisateur
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Faux positifs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{feedbackStats?.false_positive || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Analyses incorrectes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <GitMerge className="h-4 w-4 text-purple-600" />
                Threads analysés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{threadAnalyses?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {threadsWithIssues.length} avec problèmes détectés
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="validate" className="space-y-4">
          <TabsList>
            <TabsTrigger value="validate" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Valider les analyses ({threadAnalyses?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="actors" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Scores de confiance ({actorScores?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="corroborations" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Corroborations ({corroborations?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Historique
            </TabsTrigger>
          </TabsList>

          <TabsContent value="validate" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Thread List */}
              <Card className="lg:h-[600px] flex flex-col">
                <CardHeader className="shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Analyses de threads à valider</CardTitle>
                      <CardDescription>
                        Cliquez sur une analyse pour la valider ou la rejeter
                      </CardDescription>
                    </div>
                    <Button
                      variant={showOnlyWithIssues ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowOnlyWithIssues(!showOnlyWithIssues)}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      {showOnlyWithIssues ? `Problèmes (${threadsWithIssues.length})` : 'Filtrer problèmes'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-2">
                  {loadingThreads ? (
                    <p className="text-muted-foreground">Chargement...</p>
                  ) : displayedThreads.length === 0 ? (
                    <p className="text-muted-foreground">
                      {showOnlyWithIssues ? 'Aucune analyse avec problèmes détectés' : 'Aucune analyse disponible'}
                    </p>
                  ) : (
                    displayedThreads.map((thread) => {
                      const issues = thread.detected_issues as any[];
                      const hasIssues = issues?.length > 0;
                      return (
                        <div
                          key={thread.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedThread?.id === thread.id 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedThread(thread)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant={getSeverityColor(thread.severity)}>
                                  {thread.severity || 'Non défini'}
                                </Badge>
                                {hasIssues ? (
                                  <Badge variant="outline">{issues.length} problèmes</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-green-600 bg-green-50">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    OK
                                  </Badge>
                                )}
                              </div>
                              <p className="font-medium text-sm truncate max-w-[300px]">
                                {thread.chronological_summary?.slice(0, 100) || 'Pas de résumé'}...
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Confiance: {Math.round((thread.confidence_score || 0) * 100)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Validation Panel */}
              <Card className="lg:h-[600px] flex flex-col">
                <CardHeader className="shrink-0">
                  <CardTitle className="text-lg">Validation</CardTitle>
                  <CardDescription>
                    Examinez l'analyse et donnez votre feedback
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 overflow-y-auto">
                  {selectedThread ? (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Résumé</h4>
                        <p className="text-sm bg-muted p-3 rounded-lg">
                          {selectedThread.chronological_summary || 'Pas de résumé'}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Sévérité</h4>
                        <Badge variant={getSeverityColor(selectedThread.severity)}>
                          {selectedThread.severity || 'Non défini'}
                        </Badge>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Confiance</h4>
                        <Progress value={(selectedThread.confidence_score || 0) * 100} />
                        <p className="text-sm text-muted-foreground mt-1">
                          {Math.round((selectedThread.confidence_score || 0) * 100)}%
                        </p>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Problèmes détectés ({(selectedThread.detected_issues as any[])?.length || 0})</h4>
                        <div className="bg-muted p-3 rounded-lg text-sm max-h-[150px] overflow-y-auto">
                          {(selectedThread.detected_issues as any[])?.map((issue: any, idx: number) => (
                            <div key={idx} className="mb-2 pb-2 border-b border-border/50 last:border-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">{issue.type}</Badge>
                                <Badge variant={getSeverityColor(issue.severity)} className="text-xs">
                                  {issue.severity}
                                </Badge>
                              </div>
                              <p className="text-xs">{issue.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {selectedThread.citations && (selectedThread.citations as any[])?.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Citations</h4>
                          <div className="bg-muted p-3 rounded-lg text-sm max-h-[100px] overflow-y-auto">
                            {(selectedThread.citations as any[]).map((cit: any, idx: number) => (
                              <p key={idx} className="text-xs mb-1 italic">"{cit.text}"</p>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="font-medium mb-2">Notes (optionnel)</h4>
                        <Textarea
                          placeholder="Ajoutez des notes pour améliorer l'IA..."
                          value={feedbackNotes}
                          onChange={(e) => setFeedbackNotes(e.target.value)}
                        />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button 
                          className="flex-1" 
                          variant="default"
                          onClick={() => handleFeedback('correct')}
                          disabled={submitFeedback.isPending}
                        >
                          <ThumbsUp className="h-4 w-4 mr-2" />
                          Correct
                        </Button>
                        <Button 
                          className="flex-1" 
                          variant="secondary"
                          onClick={() => handleFeedback('partial')}
                          disabled={submitFeedback.isPending}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Partiel
                        </Button>
                        <Button 
                          className="flex-1" 
                          variant="destructive"
                          onClick={() => handleFeedback('false_positive')}
                          disabled={submitFeedback.isPending}
                        >
                          <ThumbsDown className="h-4 w-4 mr-2" />
                          Faux positif
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Sélectionnez une analyse à valider
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="actors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Scores de confiance par acteur</CardTitle>
                <CardDescription>
                  Basé sur les contradictions, promesses non tenues et comportements détectés
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingActors ? (
                  <p className="text-muted-foreground">Chargement...</p>
                ) : !actorScores || actorScores.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucun score disponible</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Les scores seront générés après l'analyse croisée des threads
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {actorScores.map((actor) => (
                      <div 
                        key={actor.id} 
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">{actor.actor_name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {actor.actor_role && <span>{actor.actor_role}</span>}
                            {actor.actor_institution && (
                              <>
                                <span>•</span>
                                <span>{actor.actor_institution}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-red-600">
                              {actor.contradictions_count || 0} contradictions
                            </span>
                            <span className="text-orange-600">
                              {actor.promises_broken_count || 0} promesses brisées
                            </span>
                            <span className="text-yellow-600">
                              {actor.hidden_communications_count || 0} comm. cachées
                            </span>
                            <span className="text-green-600">
                              {actor.helpful_actions_count || 0} actions positives
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold px-3 py-1 rounded ${getTrustScoreColor(Number(actor.trust_score))}`}>
                            {Math.round(Number(actor.trust_score))}
                          </div>
                          <div className="flex items-center justify-end mt-1">
                            {Number(actor.trust_score) >= 50 ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="corroborations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Corroborations récentes</CardTitle>
                <CardDescription>
                  Preuves croisées entre emails et pièces jointes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!corroborations || corroborations.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucune corroboration</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Lancez l'analyse dans le Pipeline pour créer des corroborations
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {corroborations.map((corr) => {
                      let incidentSummary = '';
                      try {
                        const notes = typeof corr.notes === 'string' ? JSON.parse(corr.notes) : corr.notes;
                        incidentSummary = notes?.incident_summary || '';
                      } catch {
                        incidentSummary = typeof corr.notes === 'string' ? corr.notes : '';
                      }
                      
                      return (
                        <div 
                          key={corr.id} 
                          className="p-3 rounded-lg border"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant={
                              corr.corroboration_type === 'confirmed' ? 'default' :
                              corr.corroboration_type === 'contradicted' ? 'destructive' :
                              'secondary'
                            }>
                              {corr.corroboration_type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Confiance: {Math.round(Number(corr.final_confidence) * 100)}%
                            </span>
                          </div>
                          {incidentSummary && (
                            <p className="text-sm">{incidentSummary}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>{(corr.thread_analysis_ids as string[])?.length || 0} threads</span>
                            <span>•</span>
                            <span>{(corr.attachment_ids as string[])?.length || 0} pièces jointes</span>
                            <span>•</span>
                            <Badge variant="outline">{corr.verification_status}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Historique des feedbacks</CardTitle>
                <CardDescription>
                  Tous les feedbacks enregistrés pour améliorer l'IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FeedbackHistory />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function FeedbackHistory() {
  const { data: feedbacks, isLoading } = useQuery({
    queryKey: ['all-training-feedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_training_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <p className="text-muted-foreground">Chargement...</p>;

  if (!feedbacks || feedbacks.length === 0) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Aucun feedback enregistré</p>
        <p className="text-sm text-muted-foreground mt-2">
          Validez des analyses pour entraîner l'IA
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {feedbacks.map((feedback) => (
        <div 
          key={feedback.id} 
          className="p-3 rounded-lg border bg-muted/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {feedback.feedback_type === 'correct' && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              {feedback.feedback_type === 'false_positive' && (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              {feedback.feedback_type === 'partial' && (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              )}
              <Badge variant="outline">{feedback.entity_type}</Badge>
              <Badge variant={
                feedback.feedback_type === 'correct' ? 'default' :
                feedback.feedback_type === 'false_positive' ? 'destructive' :
                'secondary'
              }>
                {feedback.feedback_type}
              </Badge>
            </div>
            <span className="text-sm text-muted-foreground">
              {new Date(feedback.created_at).toLocaleDateString('fr-CH')}
            </span>
          </div>
          {feedback.notes && (
            <p className="text-sm text-muted-foreground mt-2">{feedback.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}