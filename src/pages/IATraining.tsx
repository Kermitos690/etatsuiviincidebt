import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  RefreshCw
} from "lucide-react";

export default function IATraining() {
  const queryClient = useQueryClient();
  const [selectedDetection, setSelectedDetection] = useState<any>(null);
  const [feedbackNotes, setFeedbackNotes] = useState("");

  // Fetch betrayal detections for validation
  const { data: betrayalDetections, isLoading: loadingBetrayals } = useQuery({
    queryKey: ['betrayal-detections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('betrayal_detections')
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
    queryKey: ['corroborations'],
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
      const { error } = await supabase
        .from('ai_training_feedback')
        .insert({
          entity_id: entityId,
          entity_type: entityType,
          feedback_type: feedbackType,
          notes,
          original_detection: selectedDetection,
        });
      if (error) throw error;

      // If it's a betrayal detection, update verification status
      if (entityType === 'betrayal_detection') {
        await supabase
          .from('betrayal_detections')
          .update({
            verified: true,
            verified_at: new Date().toISOString(),
            verified_by: 'user',
          })
          .eq('id', entityId);
      }
    },
    onSuccess: () => {
      toast.success("Feedback enregistré");
      queryClient.invalidateQueries({ queryKey: ['betrayal-detections'] });
      queryClient.invalidateQueries({ queryKey: ['training-feedback-stats'] });
      setSelectedDetection(null);
      setFeedbackNotes("");
    },
    onError: () => {
      toast.error("Erreur lors de l'enregistrement du feedback");
    }
  });

  const handleFeedback = (type: string) => {
    if (!selectedDetection) return;
    
    submitFeedback.mutate({
      entityId: selectedDetection.id,
      entityType: 'betrayal_detection',
      feedbackType: type,
      notes: feedbackNotes,
    });
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 50) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critique': return "destructive";
      case 'haute': return "destructive";
      case 'moyenne': return "secondary";
      default: return "outline";
    }
  };

  const unverifiedDetections = betrayalDetections?.filter(d => !d.verified) || [];
  const verifiedDetections = betrayalDetections?.filter(d => d.verified) || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            Entraînement IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Validez les détections pour améliorer la précision de l'IA
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
              {feedbackStats?.total || 0} détections évaluées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Détections correctes
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
              Détections incorrectes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              À valider
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{unverifiedDetections.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Détections en attente
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="validate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="validate" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Valider les détections ({unverifiedDetections.length})
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
            {/* Detection List */}
            <Card className="h-[600px] overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">Détections à valider</CardTitle>
                <CardDescription>
                  Cliquez sur une détection pour la valider ou la rejeter
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-y-auto h-[500px] space-y-2">
                {loadingBetrayals ? (
                  <p className="text-muted-foreground">Chargement...</p>
                ) : unverifiedDetections.length === 0 ? (
                  <p className="text-muted-foreground">Aucune détection à valider</p>
                ) : (
                  unverifiedDetections.map((detection) => (
                    <div
                      key={detection.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedDetection?.id === detection.id 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedDetection(detection)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={getSeverityColor(detection.severity)}>
                              {detection.severity}
                            </Badge>
                            <Badge variant="outline">{detection.betrayal_type}</Badge>
                          </div>
                          <p className="font-medium">{detection.actor_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Confiance: {detection.confidence}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Validation Panel */}
            <Card className="h-[600px] overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">Validation</CardTitle>
                <CardDescription>
                  Examinez la détection et donnez votre feedback
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-y-auto h-[500px]">
                {selectedDetection ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Acteur concerné</h4>
                      <p className="text-lg">{selectedDetection.actor_name}</p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Type de trahison</h4>
                      <Badge variant="secondary">{selectedDetection.betrayal_type}</Badge>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Sévérité</h4>
                      <Badge variant={getSeverityColor(selectedDetection.severity)}>
                        {selectedDetection.severity}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Niveau de confiance</h4>
                      <Badge variant="outline">{selectedDetection.confidence}</Badge>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Preuves</h4>
                      <div className="bg-muted p-3 rounded-lg text-sm max-h-[150px] overflow-y-auto">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(selectedDetection.evidence, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {selectedDetection.citations && (
                      <div>
                        <h4 className="font-medium mb-2">Citations</h4>
                        <div className="bg-muted p-3 rounded-lg text-sm max-h-[100px] overflow-y-auto">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(selectedDetection.citations, null, 2)}
                          </pre>
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
                    Sélectionnez une détection à valider
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
              ) : actorScores?.length === 0 ? (
                <p className="text-muted-foreground">Aucun score disponible</p>
              ) : (
                <div className="space-y-3">
                  {actorScores?.map((actor) => (
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
              {corroborations?.length === 0 ? (
                <p className="text-muted-foreground">Aucune corroboration</p>
              ) : (
                <div className="space-y-3">
                  {corroborations?.map((corr) => (
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
                      {corr.notes && (
                        <p className="text-sm">{
                          typeof corr.notes === 'string' 
                            ? JSON.parse(corr.notes).incident_summary 
                            : (corr.notes as any).incident_summary
                        }</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>{(corr.thread_analysis_ids as string[])?.length || 0} threads</span>
                        <span>•</span>
                        <span>{(corr.attachment_ids as string[])?.length || 0} pièces jointes</span>
                        <span>•</span>
                        <Badge variant="outline">{corr.verification_status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Détections validées</CardTitle>
              <CardDescription>
                Historique des détections confirmées ou rejetées
              </CardDescription>
            </CardHeader>
            <CardContent>
              {verifiedDetections.length === 0 ? (
                <p className="text-muted-foreground">Aucune détection validée</p>
              ) : (
                <div className="space-y-2">
                  {verifiedDetections.map((detection) => (
                    <div 
                      key={detection.id} 
                      className="p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium">{detection.actor_name}</span>
                          <Badge variant="outline">{detection.betrayal_type}</Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(detection.verified_at || '').toLocaleDateString('fr-CH')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
