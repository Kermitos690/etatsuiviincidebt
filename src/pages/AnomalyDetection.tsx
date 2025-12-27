import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAnomalyDetection } from '@/hooks/useAnomalyDetection';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  AlertTriangle, 
  RefreshCw, 
  TrendingUp, 
  Clock, 
  MessageSquare, 
  Users,
  Zap,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  Activity,
  BarChart3
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const SEVERITY_CONFIG = {
  critical: { color: 'bg-red-500', textColor: 'text-red-500', label: 'Critique', icon: AlertTriangle },
  high: { color: 'bg-orange-500', textColor: 'text-orange-500', label: 'Élevée', icon: AlertTriangle },
  medium: { color: 'bg-yellow-500', textColor: 'text-yellow-500', label: 'Moyenne', icon: Activity },
  low: { color: 'bg-blue-500', textColor: 'text-blue-500', label: 'Faible', icon: Activity }
};

const TYPE_CONFIG = {
  frequency_spike: { icon: TrendingUp, label: 'Pic de fréquence', color: 'text-purple-500' },
  timing_anomaly: { icon: Clock, label: 'Anomalie temporelle', color: 'text-blue-500' },
  sentiment_shift: { icon: MessageSquare, label: 'Changement de ton', color: 'text-orange-500' },
  behavior_change: { icon: Users, label: 'Changement comportemental', color: 'text-red-500' }
};

const STATUS_CONFIG = {
  new: { label: 'Nouveau', variant: 'default' as const },
  investigating: { label: 'En cours', variant: 'secondary' as const },
  confirmed: { label: 'Confirmé', variant: 'destructive' as const },
  resolved: { label: 'Résolu', variant: 'outline' as const },
  false_positive: { label: 'Faux positif', variant: 'outline' as const }
};

export default function AnomalyDetection() {
  const isMobile = useIsMobile();
  const { 
    anomalies, 
    stats, 
    loadingAnomalies, 
    isDetecting, 
    detectAnomalies,
    updateBaselines,
    updateStatus 
  } = useAnomalyDetection();
  
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedAnomaly, setSelectedAnomaly] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const filteredAnomalies = anomalies.filter(a => {
    if (filterType !== 'all' && a.anomaly_type !== filterType) return false;
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    return true;
  });

  const handleStatusChange = (status: string) => {
    if (!selectedAnomaly) return;
    updateStatus({ 
      id: selectedAnomaly.id, 
      status, 
      notes: status === 'resolved' || status === 'false_positive' ? resolutionNotes : undefined 
    });
    setSelectedAnomaly(null);
    setResolutionNotes('');
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <PageHeader
          title="Détection d'Anomalies"
          description="Identification automatique des patterns inhabituels"
          icon={<Zap className="h-6 w-6" />}
        />

        <div className="flex-1 p-4 space-y-4 overflow-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span className="text-2xl font-bold">{stats?.by_severity.critical || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Critiques</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span className="text-2xl font-bold">{stats?.by_severity.high || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Élevées</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Activity className="h-5 w-5 text-yellow-500" />
                  <span className="text-2xl font-bold">{stats?.by_severity.medium || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Moyennes</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Activity className="h-5 w-5 text-blue-500" />
                  <span className="text-2xl font-bold">{stats?.by_severity.low || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Faibles</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold">{stats?.by_status.resolved || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Résolues</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{stats?.total || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total</p>
              </CardContent>
            </Card>
          </div>

          {/* Actions and Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <Button 
              onClick={() => detectAnomalies()} 
              disabled={isDetecting}
              className="gap-2"
            >
              <Zap className={`h-4 w-4 ${isDetecting ? 'animate-pulse' : ''}`} />
              {isDetecting ? 'Analyse en cours...' : 'Détecter les anomalies'}
            </Button>

            <Button 
              variant="outline" 
              onClick={() => updateBaselines()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Mettre à jour les baselines
            </Button>

            <div className="flex-1" />

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="frequency_spike">Pic de fréquence</SelectItem>
                <SelectItem value="timing_anomaly">Anomalie temporelle</SelectItem>
                <SelectItem value="sentiment_shift">Changement de ton</SelectItem>
                <SelectItem value="behavior_change">Comportement</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sévérité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="critical">Critique</SelectItem>
                <SelectItem value="high">Élevée</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="low">Faible</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="new">Nouveau</SelectItem>
                <SelectItem value="investigating">En cours</SelectItem>
                <SelectItem value="confirmed">Confirmé</SelectItem>
                <SelectItem value="resolved">Résolu</SelectItem>
                <SelectItem value="false_positive">Faux positif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Anomalies List */}
          <Tabs defaultValue="list" className="flex-1">
            <TabsList>
              <TabsTrigger value="list">Liste ({filteredAnomalies.length})</TabsTrigger>
              <TabsTrigger value="by-type">Par type</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-4">
              {loadingAnomalies ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAnomalies.length === 0 ? (
                <Card className="p-8 text-center">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground">Aucune anomalie détectée</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cliquez sur "Détecter les anomalies" pour lancer une analyse
                  </p>
                </Card>
              ) : (
              <div className={isMobile ? "space-y-3 pb-4" : "space-y-3 max-h-[500px] overflow-y-auto pr-2"}>
                    {filteredAnomalies.map(anomaly => {
                      const typeConfig = TYPE_CONFIG[anomaly.anomaly_type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.behavior_change;
                      const severityConfig = SEVERITY_CONFIG[anomaly.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.medium;
                      const statusConfig = STATUS_CONFIG[anomaly.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.new;
                      const TypeIcon = typeConfig.icon;

                      return (
                        <Card 
                          key={anomaly.id} 
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => setSelectedAnomaly(anomaly)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className={`p-2 rounded-lg ${severityConfig.color}/10`}>
                                <TypeIcon className={`h-5 w-5 ${typeConfig.color}`} />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium truncate">{anomaly.title}</h4>
                                  <Badge variant={statusConfig.variant} className="shrink-0">
                                    {statusConfig.label}
                                  </Badge>
                                </div>
                                
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {anomaly.description}
                                </p>

                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <div className={`w-2 h-2 rounded-full ${severityConfig.color}`} />
                                    {severityConfig.label}
                                  </span>
                                  <span>Confiance: {anomaly.confidence}%</span>
                                  <span>Déviation: {anomaly.deviation_score}%</span>
                                  <span>
                                    {formatDistanceToNow(new Date(anomaly.detected_at), { 
                                      addSuffix: true, 
                                      locale: fr 
                                    })}
                                  </span>
                                </div>
                              </div>

                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
              </div>
              )}
            </TabsContent>

            <TabsContent value="by-type" className="mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(TYPE_CONFIG).map(([type, config]) => {
                  const typeAnomalies = filteredAnomalies.filter(a => a.anomaly_type === type);
                  const Icon = config.icon;

                  return (
                    <Card key={type}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Icon className={`h-5 w-5 ${config.color}`} />
                          {config.label}
                          <Badge variant="secondary" className="ml-auto">
                            {typeAnomalies.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {typeAnomalies.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Aucune anomalie</p>
                        ) : (
                          <div className="space-y-2">
                            {typeAnomalies.slice(0, 3).map(a => (
                              <div 
                                key={a.id} 
                                className="p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer"
                                onClick={() => setSelectedAnomaly(a)}
                              >
                                <p className="text-sm font-medium truncate">{a.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {SEVERITY_CONFIG[a.severity as keyof typeof SEVERITY_CONFIG]?.label} • {a.confidence}% confiance
                                </p>
                              </div>
                            ))}
                            {typeAnomalies.length > 3 && (
                              <p className="text-xs text-muted-foreground text-center">
                                +{typeAnomalies.length - 3} autres
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Anomaly Detail Dialog */}
      <Dialog open={!!selectedAnomaly} onOpenChange={() => setSelectedAnomaly(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedAnomaly && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const config = TYPE_CONFIG[selectedAnomaly.anomaly_type as keyof typeof TYPE_CONFIG];
                    const Icon = config?.icon || Activity;
                    return <Icon className={`h-5 w-5 ${config?.color || ''}`} />;
                  })()}
                  {selectedAnomaly.title}
                </DialogTitle>
                <DialogDescription>
                  Détectée {formatDistanceToNow(new Date(selectedAnomaly.detected_at), { 
                    addSuffix: true, 
                    locale: fr 
                  })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={SEVERITY_CONFIG[selectedAnomaly.severity as keyof typeof SEVERITY_CONFIG]?.color}>
                    {SEVERITY_CONFIG[selectedAnomaly.severity as keyof typeof SEVERITY_CONFIG]?.label}
                  </Badge>
                  <Badge variant="outline">
                    Confiance: {selectedAnomaly.confidence}%
                  </Badge>
                  <Badge variant="outline">
                    Déviation: {selectedAnomaly.deviation_score}%
                  </Badge>
                  <Badge variant={STATUS_CONFIG[selectedAnomaly.status as keyof typeof STATUS_CONFIG]?.variant}>
                    {STATUS_CONFIG[selectedAnomaly.status as keyof typeof STATUS_CONFIG]?.label}
                  </Badge>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedAnomaly.description}</p>
                </div>

                {selectedAnomaly.ai_explanation && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Analyse IA</h4>
                    <p className="text-sm text-muted-foreground">{selectedAnomaly.ai_explanation}</p>
                  </div>
                )}

                {selectedAnomaly.ai_recommendations?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Recommandations</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {selectedAnomaly.ai_recommendations.map((rec: string, i: number) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium mb-1">Données du pattern</h4>
                  <pre className="text-xs bg-muted p-2 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedAnomaly.pattern_data, null, 2)}
                  </pre>
                </div>

                {(selectedAnomaly.status === 'new' || selectedAnomaly.status === 'investigating') && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Notes de résolution</h4>
                    <Textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Ajoutez des notes sur cette anomalie..."
                      rows={3}
                    />
                  </div>
                )}
              </div>

              <DialogFooter className="flex-wrap gap-2">
                {selectedAnomaly.status === 'new' && (
                  <Button 
                    variant="secondary" 
                    onClick={() => handleStatusChange('investigating')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Investiguer
                  </Button>
                )}
                {(selectedAnomaly.status === 'new' || selectedAnomaly.status === 'investigating') && (
                  <>
                    <Button 
                      variant="destructive" 
                      onClick={() => handleStatusChange('confirmed')}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Confirmer
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleStatusChange('false_positive')}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Faux positif
                    </Button>
                    <Button 
                      onClick={() => handleStatusChange('resolved')}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Résoudre
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
