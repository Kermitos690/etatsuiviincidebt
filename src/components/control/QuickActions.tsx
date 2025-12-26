import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Brain,
  RefreshCw,
  Mail,
  AlertTriangle,
  FileSearch,
  Loader2,
  Clock,
  CheckCircle2,
  Zap,
  Calendar,
  Bell
} from 'lucide-react';

interface QuickActionsProps {
  emailsCount: number;
  unprocessedCount: number;
  threadsCount: number;
}

export function QuickActions({ emailsCount, unprocessedCount, threadsCount }: QuickActionsProps) {
  const queryClient = useQueryClient();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [lastAnalysis, setLastAnalysis] = useState<{
    emails: number;
    threads: number;
    alerts: number;
  } | null>(null);

  const runBatchAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalyzeProgress(0);
    
    try {
      // Step 1: Extract facts
      setAnalyzeProgress(20);
      toast.info('Extraction des faits...');
      
      const factsRes = await supabase.functions.invoke('extract-email-facts', {
        body: { batchSize: 100 }
      });
      
      // Step 2: Analyze threads
      setAnalyzeProgress(50);
      toast.info('Analyse des threads...');
      
      const threadsRes = await supabase.functions.invoke('analyze-thread-complete', {
        body: { batchSize: 20 }
      });
      
      // Step 3: Cross-reference
      setAnalyzeProgress(80);
      toast.info('Corroboration croisée...');
      
      const crossRefRes = await supabase.functions.invoke('cross-reference-analysis', {
        body: {}
      });
      
      setAnalyzeProgress(100);
      
      setLastAnalysis({
        emails: factsRes.data?.results?.processed || 0,
        threads: threadsRes.data?.results?.analyzed || 0,
        alerts: crossRefRes.data?.results?.corroborations || 0
      });
      
      toast.success('Analyse batch terminée !');
      queryClient.invalidateQueries({ queryKey: ['control-emails'] });
      queryClient.invalidateQueries({ queryKey: ['control-thread-analyses'] });
      queryClient.invalidateQueries({ queryKey: ['control-audit-alerts'] });
      
    } catch (error) {
      console.error('Batch analysis error:', error);
      toast.error('Erreur lors de l\'analyse batch');
    } finally {
      setIsAnalyzing(false);
      setAnalyzeProgress(0);
    }
  };

  const runDailyAudit = async () => {
    setIsRunningAudit(true);
    
    try {
      toast.info('Lancement de l\'audit quotidien...');
      
      const result = await supabase.functions.invoke('daily-audit-analysis', {
        body: {}
      });
      
      if (result.error) throw result.error;
      
      const data = result.data;
      toast.success(`Audit terminé: ${data.emailsProcessed} emails, ${data.threadsAnalyzed} threads analysés`);
      
      if (data.dailySummary?.key_issues?.length > 0) {
        toast.warning(`${data.dailySummary.key_issues.length} problèmes identifiés`, {
          duration: 5000
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['control-audit-alerts'] });
      
    } catch (error) {
      console.error('Daily audit error:', error);
      toast.error('Erreur lors de l\'audit quotidien');
    } finally {
      setIsRunningAudit(false);
    }
  };

  const generateMonthlyReport = async () => {
    setIsGeneratingReport(true);
    
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      
      toast.info('Génération du rapport mensuel...');
      
      const result = await supabase.functions.invoke('generate-monthly-report', {
        body: { month, year }
      });
      
      if (result.error) throw result.error;
      
      toast.success(`Rapport ${month}/${year} généré avec succès !`);
      
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error('Erreur lors de la génération du rapport');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Actions Rapides
        </CardTitle>
        <CardDescription>
          Lancez des analyses et générez des rapports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Batch Analysis */}
        <div className="p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="font-medium">Analyse Batch IA</span>
            </div>
            <Badge variant="outline">
              {unprocessedCount} emails en attente
            </Badge>
          </div>
          
          {isAnalyzing && (
            <div className="mb-3">
              <Progress value={analyzeProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {analyzeProgress < 30 ? 'Extraction des faits...' :
                 analyzeProgress < 60 ? 'Analyse des threads...' :
                 analyzeProgress < 90 ? 'Corroboration croisée...' : 'Finalisation...'}
              </p>
            </div>
          )}
          
          {lastAnalysis && !isAnalyzing && (
            <div className="mb-3 p-2 rounded bg-green-500/10 border border-green-500/20">
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Dernière analyse: {lastAnalysis.emails} emails, {lastAnalysis.threads} threads, {lastAnalysis.alerts} corroborations
              </p>
            </div>
          )}
          
          <Button 
            onClick={runBatchAnalysis} 
            disabled={isAnalyzing || unprocessedCount === 0}
            className="w-full"
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isAnalyzing ? 'Analyse en cours...' : 'Lancer l\'analyse batch'}
          </Button>
        </div>

        {/* Daily Audit */}
        <div className="p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-orange-500" />
              <span className="font-medium">Audit Quotidien</span>
            </div>
            <Badge variant="secondary">
              <Clock className="h-3 w-3 mr-1" />
              Auto
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">
            Analyse les emails récents, détecte les récidives et génère les alertes
          </p>
          
          <Button 
            variant="outline"
            onClick={runDailyAudit}
            disabled={isRunningAudit}
            className="w-full"
          >
            {isRunningAudit ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-2" />
            )}
            {isRunningAudit ? 'Audit en cours...' : 'Lancer l\'audit'}
          </Button>
        </div>

        {/* Monthly Report */}
        <div className="p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span className="font-medium">Rapport Mensuel</span>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">
            Génère un rapport complet avec statistiques, violations et recommandations IA
          </p>
          
          <Button 
            variant="outline"
            onClick={generateMonthlyReport}
            disabled={isGeneratingReport}
            className="w-full"
          >
            {isGeneratingReport ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileSearch className="h-4 w-4 mr-2" />
            )}
            {isGeneratingReport ? 'Génération...' : 'Générer le rapport'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
