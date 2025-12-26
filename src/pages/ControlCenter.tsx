import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, PageHeader } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIncidentStore } from "@/stores/incidentStore";
import { EmailLink } from "@/components/email";
import { QuickActions, RealtimeAlerts, ActorTrustPanel, CorroborationPanel } from "@/components/control";
import { 
  LayoutDashboard, 
  AlertTriangle, 
  Scale, 
  TrendingUp, 
  TrendingDown,
  Mail,
  FileText,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Zap,
  Brain
} from "lucide-react";
import { Link } from "react-router-dom";

export default function ControlCenter() {
  const { incidents } = useIncidentStore();

  // Fetch emails
  const { data: emails, isLoading: loadingEmails } = useQuery({
    queryKey: ['control-emails'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    }
  });

  // Fetch thread analyses
  const { data: threadAnalyses, isLoading: loadingThreads } = useQuery({
    queryKey: ['control-thread-analyses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('thread_analyses')
        .select('*')
        .order('analyzed_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    }
  });

  // Fetch audit alerts
  const { data: auditAlerts, isLoading: loadingAlerts } = useQuery({
    queryKey: ['control-audit-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    }
  });

  // Stats calculations
  const totalEmails = emails?.length || 0;
  const processedEmails = emails?.filter(e => e.processed).length || 0;
  const unprocessedEmails = totalEmails - processedEmails;
  
  const totalIncidents = incidents.length;
  const openIncidents = incidents.filter(i => i.statut === 'Ouvert').length;
  const criticalIncidents = incidents.filter(i => i.gravite === 'Critique').length;
  const transmittedToJP = incidents.filter(i => i.transmisJP).length;
  
  const threadsWithIssues = threadAnalyses?.filter(t => 
    (t.detected_issues as any[])?.length > 0
  ).length || 0;
  
  const unresolvedAlerts = auditAlerts?.filter(a => !a.is_resolved).length || 0;
  const criticalAlerts = auditAlerts?.filter(a => a.severity === 'critique' && !a.is_resolved).length || 0;

  const avgScore = incidents.length > 0
    ? Math.round(incidents.reduce((a, i) => a + i.score, 0) / incidents.length)
    : 0;

  const getSeverityColor = (severity?: string | null) => {
    switch (severity?.toLowerCase()) {
      case 'critique':
      case 'critical': return "text-red-600 bg-red-100 dark:bg-red-900/30";
      case 'haute':
      case 'high':
      case 'élevée': return "text-orange-600 bg-orange-100 dark:bg-orange-900/30";
      case 'moyenne':
      case 'medium': return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
      default: return "text-green-600 bg-green-100 dark:bg-green-900/30";
    }
  };

  const getSeverityBadge = (severity?: string | null) => {
    switch (severity?.toLowerCase()) {
      case 'critique':
      case 'critical': return "destructive";
      case 'haute':
      case 'high':
      case 'élevée': return "destructive";
      case 'moyenne':
      case 'medium': return "secondary";
      default: return "outline";
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Centre de Contrôle"
          description="Vue d'ensemble du système d'audit juridique"
        />

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Emails
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEmails}</div>
              <p className="text-xs text-muted-foreground">
                {unprocessedEmails} à traiter
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Incidents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalIncidents}</div>
              <p className="text-xs text-muted-foreground">
                {openIncidents} ouverts
              </p>
            </CardContent>
          </Card>

          <Card className={criticalIncidents > 0 ? "border-destructive/50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <XCircle className="h-3 w-3 text-destructive" />
                Critiques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{criticalIncidents}</div>
              <p className="text-xs text-muted-foreground">
                Priorité maximale
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Scale className="h-3 w-3" />
                Transmis JP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{transmittedToJP}</div>
              <p className="text-xs text-muted-foreground">
                Au Juge de Paix
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Score moyen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgScore}</div>
              <Progress value={avgScore} className="mt-1 h-1" />
            </CardContent>
          </Card>

          <Card className={unresolvedAlerts > 0 ? "border-orange-500/50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-orange-500" />
                Alertes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{unresolvedAlerts}</div>
              <p className="text-xs text-muted-foreground">
                {criticalAlerts} critiques
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Actions
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alertes ({unresolvedAlerts})
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Analyse IA
            </TabsTrigger>
            <TabsTrigger value="violations" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Violations ({threadsWithIssues})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Recent Incidents */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Incidents récents
                    </CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/incidents">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {incidents.slice(0, 8).map(inc => (
                        <Link 
                          key={inc.id} 
                          to={`/incidents/${inc.id}`}
                          className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={getSeverityBadge(inc.gravite)}>
                                  {inc.gravite}
                                </Badge>
                                <span className="text-xs text-muted-foreground">#{inc.numero}</span>
                              </div>
                              <p className="text-sm font-medium truncate">{inc.titre}</p>
                              <p className="text-xs text-muted-foreground">{inc.institution}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold">{inc.score}</div>
                              <p className="text-xs text-muted-foreground">{inc.statut}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Recent Emails */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Emails récents
                    </CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/emails">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {loadingEmails ? (
                        <p className="text-muted-foreground text-sm">Chargement...</p>
                      ) : emails?.slice(0, 8).map(email => (
                        <div key={email.id} className="p-3 rounded-lg border">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{email.subject}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                De: {email.sender}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {email.processed ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <Clock className="h-4 w-4 text-muted-foreground" />
                              )}
                              <EmailLink emailId={email.id} size="sm" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Alertes non résolues
                </CardTitle>
                <CardDescription>
                  Alertes générées par l'analyse automatique
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {loadingAlerts ? (
                      <p className="text-muted-foreground text-sm">Chargement...</p>
                    ) : auditAlerts?.filter(a => !a.is_resolved).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                        <p>Aucune alerte non résolue</p>
                      </div>
                    ) : auditAlerts?.filter(a => !a.is_resolved).map(alert => (
                      <div key={alert.id} className="p-4 rounded-lg border">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={getSeverityBadge(alert.severity)}>
                              {alert.severity}
                            </Badge>
                            <Badge variant="outline">{alert.alert_type}</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(alert.created_at).toLocaleDateString('fr-CH')}
                          </span>
                        </div>
                        <h4 className="font-medium mb-1">{alert.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                        {alert.related_email_id && (
                          <EmailLink 
                            emailId={alert.related_email_id} 
                            variant="outline"
                            size="sm"
                            label="Voir l'email source"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="violations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Violations détectées
                </CardTitle>
                <CardDescription>
                  Problèmes identifiés dans les analyses de threads
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {loadingThreads ? (
                      <p className="text-muted-foreground text-sm">Chargement...</p>
                    ) : threadAnalyses?.filter(t => (t.detected_issues as any[])?.length > 0).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                        <p>Aucune violation détectée</p>
                      </div>
                    ) : threadAnalyses?.filter(t => (t.detected_issues as any[])?.length > 0).map(thread => {
                      const issues = thread.detected_issues as any[];
                      return (
                        <div key={thread.id} className="p-4 rounded-lg border">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={getSeverityBadge(thread.severity)}>
                                {thread.severity}
                              </Badge>
                              <Badge variant="outline">{issues?.length || 0} problèmes</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Confiance: {Math.round((thread.confidence_score || 0) * 100)}%
                            </span>
                          </div>
                          <p className="text-sm mb-2 line-clamp-2">
                            {thread.chronological_summary || 'Pas de résumé'}
                          </p>
                          <div className="space-y-1">
                            {issues?.slice(0, 2).map((issue: any, idx: number) => (
                              <div key={idx} className="text-xs bg-muted/50 p-2 rounded">
                                <Badge variant="outline" className="text-xs mr-2">{issue.type}</Badge>
                                {issue.description?.substring(0, 80)}...
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <QuickActions 
                emailsCount={totalEmails}
                unprocessedCount={unprocessedEmails}
                threadsCount={threadAnalyses?.length || 0}
              />
              <RealtimeAlerts />
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ActorTrustPanel />
              <CorroborationPanel />
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Navigation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Navigation rapide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link to="/analysis-pipeline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Pipeline d'analyse
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/exports">
                  <FileText className="h-4 w-4 mr-2" />
                  Exporter PDF
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/nouveau">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Nouvel incident
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/ia-training">
                  <Users className="h-4 w-4 mr-2" />
                  Entraînement IA
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/swipe-training">
                  <Brain className="h-4 w-4 mr-2" />
                  Swipe Training
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
