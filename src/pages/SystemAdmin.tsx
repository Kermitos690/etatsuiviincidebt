import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout, PageHeader } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Download,
  Database,
  Shield,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  FileJson,
  FileSpreadsheet,
  Calendar,
  Server,
  Cpu,
  HardDrive
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MonitoringResult {
  database: {
    totalEmails: number;
    totalIncidents: number;
    unresolvedAlerts: number;
    criticalAlerts: number;
    recentErrors: any[];
  };
  health: {
    status: 'healthy' | 'warning' | 'critical';
    checks: {
      name: string;
      status: 'pass' | 'fail';
      message: string;
    }[];
  };
  metrics: {
    emailsLast24h: number;
    incidentsLast24h: number;
    analysesLast24h: number;
  };
  recommendations: string[];
}

export default function SystemAdmin() {
  const queryClient = useQueryClient();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [backupOptions, setBackupOptions] = useState({
    format: 'json' as 'json' | 'csv',
    includeIncidents: true,
    includeEmails: true,
    includeAttachments: false,
    includeAlerts: true
  });

  // Fetch monitoring data
  const { data: monitoringData, isLoading: loadingMonitoring, refetch: refetchMonitoring } = useQuery({
    queryKey: ['system-monitoring'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('monitoring-logs');
      if (error) throw error;
      return data as MonitoringResult;
    },
    refetchInterval: 60000 // Auto refresh every minute
  });

  const runBackup = async () => {
    setIsBackingUp(true);
    try {
      toast.info('Génération du backup en cours...');
      
      const { data, error } = await supabase.functions.invoke('backup-data', {
        body: backupOptions
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], {
        type: backupOptions.format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.${backupOptions.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Backup téléchargé avec succès');
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Erreur lors du backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  const runMonitoringCheck = async () => {
    setIsMonitoring(true);
    try {
      await refetchMonitoring();
      toast.success('Vérification du monitoring terminée');
    } catch (error) {
      toast.error('Erreur lors du monitoring');
    } finally {
      setIsMonitoring(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return 'text-green-500 bg-green-500/10';
      case 'warning':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'critical':
      case 'fail':
        return 'text-red-500 bg-red-500/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Administration Système"
          description="Backup, monitoring et gestion de l'infrastructure"
        />

        <Tabs defaultValue="monitoring" className="space-y-4">
          <TabsList>
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Monitoring
            </TabsTrigger>
            <TabsTrigger value="backup" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Backup
            </TabsTrigger>
          </TabsList>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">État du Système</h2>
              <Button onClick={runMonitoringCheck} disabled={isMonitoring}>
                {isMonitoring ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Actualiser
              </Button>
            </div>

            {loadingMonitoring ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : monitoringData ? (
              <div className="grid gap-4">
                {/* Overall Status */}
                <Card className={getStatusColor(monitoringData.health.status)}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(monitoringData.health.status)}
                        <div>
                          <h3 className="text-xl font-bold capitalize">
                            {monitoringData.health.status === 'healthy' ? 'Système opérationnel' :
                             monitoringData.health.status === 'warning' ? 'Attention requise' :
                             'Problèmes critiques'}
                          </h3>
                          <p className="text-sm opacity-75">
                            Dernière vérification: {format(new Date(), 'HH:mm', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={monitoringData.health.status === 'healthy' ? 'default' : 'destructive'}
                        className="text-lg px-4 py-1"
                      >
                        {monitoringData.health.status.toUpperCase()}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/20">
                          <Database className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{monitoringData.database.totalEmails}</p>
                          <p className="text-xs text-muted-foreground">Emails totaux</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/20">
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{monitoringData.database.totalIncidents}</p>
                          <p className="text-xs text-muted-foreground">Incidents</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/20">
                          <Activity className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{monitoringData.metrics.emailsLast24h}</p>
                          <p className="text-xs text-muted-foreground">Emails (24h)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={monitoringData.database.criticalAlerts > 0 ? 'border-destructive' : ''}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-500/20">
                          <XCircle className="h-5 w-5 text-red-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-red-500">{monitoringData.database.criticalAlerts}</p>
                          <p className="text-xs text-muted-foreground">Alertes critiques</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Health Checks */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Vérifications de santé
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {monitoringData.health.checks.map((check, idx) => (
                        <div 
                          key={idx}
                          className={`p-3 rounded-lg border flex items-center justify-between ${
                            check.status === 'pass' ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {check.status === 'pass' ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <div>
                              <p className="font-medium">{check.name}</p>
                              <p className="text-sm text-muted-foreground">{check.message}</p>
                            </div>
                          </div>
                          <Badge variant={check.status === 'pass' ? 'default' : 'destructive'}>
                            {check.status === 'pass' ? 'OK' : 'FAIL'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                {monitoringData.recommendations.length > 0 && (
                  <Card className="border-yellow-500/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-yellow-500">
                        <AlertTriangle className="h-5 w-5" />
                        Recommandations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {monitoringData.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-yellow-500 mt-0.5">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Cliquez sur Actualiser pour vérifier l'état du système</p>
              </div>
            )}
          </TabsContent>

          {/* Backup Tab */}
          <TabsContent value="backup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Exporter les données
                </CardTitle>
                <CardDescription>
                  Créez un backup complet de vos données d'audit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Format selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Format d'export</Label>
                  <div className="flex gap-4">
                    <Button
                      variant={backupOptions.format === 'json' ? 'default' : 'outline'}
                      onClick={() => setBackupOptions(prev => ({ ...prev, format: 'json' }))}
                      className="flex items-center gap-2"
                    >
                      <FileJson className="h-4 w-4" />
                      JSON (complet)
                    </Button>
                    <Button
                      variant={backupOptions.format === 'csv' ? 'default' : 'outline'}
                      onClick={() => setBackupOptions(prev => ({ ...prev, format: 'csv' }))}
                      className="flex items-center gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV (incidents)
                    </Button>
                  </div>
                </div>

                {/* Data selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Données à inclure</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="include-incidents"
                        checked={backupOptions.includeIncidents}
                        onCheckedChange={(checked) => 
                          setBackupOptions(prev => ({ ...prev, includeIncidents: checked }))
                        }
                      />
                      <Label htmlFor="include-incidents">Incidents</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="include-emails"
                        checked={backupOptions.includeEmails}
                        onCheckedChange={(checked) => 
                          setBackupOptions(prev => ({ ...prev, includeEmails: checked }))
                        }
                      />
                      <Label htmlFor="include-emails">Emails</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="include-attachments"
                        checked={backupOptions.includeAttachments}
                        onCheckedChange={(checked) => 
                          setBackupOptions(prev => ({ ...prev, includeAttachments: checked }))
                        }
                      />
                      <Label htmlFor="include-attachments">Pièces jointes (métadonnées)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="include-alerts"
                        checked={backupOptions.includeAlerts}
                        onCheckedChange={(checked) => 
                          setBackupOptions(prev => ({ ...prev, includeAlerts: checked }))
                        }
                      />
                      <Label htmlFor="include-alerts">Alertes d'audit</Label>
                    </div>
                  </div>
                </div>

                {/* Download button */}
                <Button 
                  onClick={runBackup} 
                  disabled={isBackingUp}
                  className="w-full"
                  size="lg"
                >
                  {isBackingUp ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-5 w-5 mr-2" />
                  )}
                  {isBackingUp ? 'Génération en cours...' : 'Télécharger le backup'}
                </Button>
              </CardContent>
            </Card>

            {/* Backup info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informations sur les backups</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <FileJson className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Format JSON</p>
                    <p>Export complet avec toutes les données sélectionnées, incluant les analyses de threads, scores de confiance et corroborations.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Format CSV</p>
                    <p>Export des incidents uniquement, compatible avec Excel et Google Sheets.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
