import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Search,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Filter,
  Globe,
  Mail,
  Zap,
  Shield,
  RotateCcw,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { getSpamReasonLabel } from '@/utils/emailFilters';

interface FilterCleanupPanelProps {
  gmailConfig: { domains: string[]; keywords: string[] } | null;
}

interface AnalysisResult {
  totalEmails: number;
  toKeep: number;
  toDelete: number;
  protected: number;
  deleted: number;
  mode: string;
  filters: {
    domains: string[];
    keywords: string[];
    blacklistCount: number;
  };
  deletionReasons: Record<string, number>;
  deleteSamples: {
    id: string;
    subject: string;
    sender: string;
    reason: string;
    pattern?: string;
  }[];
  protectedEmails: {
    id: string;
    subject: string;
    sender: string;
  }[];
  domainDistribution: [string, number][];
  deletedByDomain: [string, number][];
}

export function FilterCleanupPanel({ gmailConfig }: FilterCleanupPanelProps) {
  const navigate = useNavigate();
  const [analyzing, setAnalyzing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPurgeDialog, setShowPurgeDialog] = useState(false);
  
  // Cleanup options
  const [hardReset, setHardReset] = useState(true); // Auto-detect newsletters
  const [useBlacklist, setUseBlacklist] = useState(true);
  const [purgeMode, setPurgeMode] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Session expirée');
        return;
      }

      const response = await supabase.functions.invoke('cleanup-emails', {
        body: { 
          dryRun: true, 
          deleteEmails: false,
          hardReset,
          useBlacklist,
          purgeAll: purgeMode,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      setAnalysisResult({
        totalEmails: data.summary?.totalEmails || 0,
        toKeep: data.summary?.toKeep || 0,
        toDelete: data.summary?.toDelete || 0,
        protected: data.summary?.protected || 0,
        deleted: 0,
        mode: data.mode || 'filter_based',
        filters: data.filters || { domains: [], keywords: [], blacklistCount: 0 },
        deletionReasons: data.deletionReasons || {},
        deleteSamples: (data.deleteSamples || []).map((e: any) => ({
          id: e.id,
          subject: e.subject || '(sans sujet)',
          sender: e.sender || 'unknown',
          reason: e.reason || 'unknown',
          pattern: e.pattern,
        })),
        protectedEmails: (data.protectedEmails || []).map((e: any) => ({
          id: e.id,
          subject: e.subject || '(sans sujet)',
          sender: e.sender || 'unknown',
        })),
        domainDistribution: data.domainDistribution || [],
        deletedByDomain: [],
      });

      toast.success('Analyse terminée');
    } catch (error) {
      console.error('Error analyzing emails:', error);
      toast.error('Erreur lors de l\'analyse');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setShowConfirmDialog(false);
    setShowPurgeDialog(false);

    try {
      const response = await supabase.functions.invoke('cleanup-emails', {
        body: { 
          dryRun: false, 
          deleteEmails: true,
          hardReset,
          useBlacklist,
          purgeAll: purgeMode,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      toast.success(`${data.summary?.deleted || 0} emails supprimés !`);
      
      // Update result with deletion info
      setAnalysisResult(prev => prev ? {
        ...prev,
        deleted: data.summary?.deleted || 0,
        deletedByDomain: data.deletedByDomain || [],
      } : null);
      
    } catch (error) {
      console.error('Error deleting emails:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  // Get top deletion reasons
  const topReasons = analysisResult 
    ? Object.entries(analysisResult.deletionReasons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];

  // Get top domains to delete
  const topDomainsToDelete = analysisResult?.deleteSamples
    ? (() => {
        const domainCounts: Record<string, number> = {};
        analysisResult.deleteSamples.forEach(e => {
          const match = e.sender.match(/@([^>]+)/);
          const domain = match ? match[1].toLowerCase() : 'unknown';
          domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        });
        return Object.entries(domainCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);
      })()
    : [];

  const deletePercentage = analysisResult && analysisResult.totalEmails > 0
    ? Math.round((analysisResult.toDelete / analysisResult.totalEmails) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Cleanup Options */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Options de nettoyage
          </CardTitle>
          <CardDescription>
            Configurez les critères de détection automatique
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="hardReset" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Détection newsletters/spam
              </Label>
              <p className="text-xs text-muted-foreground">
                Détecter automatiquement les newsletters, promotions, et spam
              </p>
            </div>
            <Switch
              id="hardReset"
              checked={hardReset}
              onCheckedChange={setHardReset}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="useBlacklist" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Utiliser la blacklist
              </Label>
              <p className="text-xs text-muted-foreground">
                Inclure les domaines/expéditeurs de votre blacklist
              </p>
            </div>
            <Switch
              id="useBlacklist"
              checked={useBlacklist}
              onCheckedChange={setUseBlacklist}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="purgeMode" className="flex items-center gap-2 text-destructive">
                <RotateCcw className="h-4 w-4" />
                Mode Purge Totale
              </Label>
              <p className="text-xs text-muted-foreground">
                Supprimer TOUS les emails (sauf ceux liés aux incidents)
              </p>
            </div>
            <Switch
              id="purgeMode"
              checked={purgeMode}
              onCheckedChange={setPurgeMode}
            />
          </div>
        </CardContent>
      </Card>

      {/* Filters info */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres configurés
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/gmail-config')}
              className="gap-1"
            >
              Modifier
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
          <CardDescription>
            Les emails correspondant à ces critères seront conservés
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Domaines ({gmailConfig?.domains?.length || 0})
            </p>
            <div className="flex flex-wrap gap-1">
              {gmailConfig?.domains?.length ? (
                gmailConfig.domains.slice(0, 15).map((d, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{d}</Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground italic">Aucun domaine configuré</span>
              )}
              {(gmailConfig?.domains?.length || 0) > 15 && (
                <Badge variant="secondary" className="text-xs">+{gmailConfig!.domains.length - 15}</Badge>
              )}
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Mots-clés ({gmailConfig?.keywords?.length || 0})
            </p>
            <div className="flex flex-wrap gap-1">
              {gmailConfig?.keywords?.length ? (
                gmailConfig.keywords.slice(0, 15).map((k, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{k}</Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground italic">Aucun mot-clé configuré</span>
              )}
              {(gmailConfig?.keywords?.length || 0) > 15 && (
                <Badge variant="secondary" className="text-xs">+{gmailConfig!.keywords.length - 15}</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analyze button */}
      <div className="flex justify-center">
        <Button 
          onClick={handleAnalyze} 
          disabled={analyzing}
          size="lg"
          className="gap-2"
          variant={purgeMode ? "destructive" : "default"}
        >
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyse en cours...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              {purgeMode ? "Analyser pour Purge Totale" : "Analyser les emails"}
            </>
          )}
        </Button>
      </div>

      {/* Analysis results */}
      {analysisResult && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Résultats de l'analyse
              {analysisResult.mode === 'purge_all' && (
                <Badge variant="destructive">Mode Purge</Badge>
              )}
              {analysisResult.mode === 'hard_reset' && (
                <Badge variant="secondary">Mode Hard Reset</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Emails à supprimer</span>
                <span className="text-muted-foreground">{deletePercentage}%</span>
              </div>
              <Progress value={deletePercentage} className="h-2" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-2xl font-bold">{analysisResult.totalEmails}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-xl font-bold">{analysisResult.toKeep}</p>
                    <p className="text-xs text-muted-foreground">À garder</p>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-xl font-bold">{analysisResult.toDelete}</p>
                    <p className="text-xs text-muted-foreground">À supprimer</p>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-xl font-bold">{analysisResult.protected}</p>
                    <p className="text-xs text-muted-foreground">Protégés</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Deletion reasons */}
            {topReasons.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-3">Raisons de suppression :</p>
                <div className="space-y-2">
                  {topReasons.map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{getSpamReasonLabel(reason)}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top domains to delete */}
            {topDomainsToDelete.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-3">Top domaines à supprimer :</p>
                <div className="grid grid-cols-2 gap-2">
                  {topDomainsToDelete.map(([domain, count]) => (
                    <div key={domain} className="flex items-center justify-between text-sm p-2 rounded bg-destructive/5">
                      <span className="truncate text-muted-foreground">{domain}</span>
                      <Badge variant="destructive" className="ml-2">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Protected emails info */}
            {analysisResult.protected > 0 && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Emails protégés</p>
                    <p className="text-xs text-muted-foreground">
                      {analysisResult.protected} emails sont liés à des incidents et ne seront pas supprimés.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Email samples */}
            {analysisResult.deleteSamples.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-3">
                  Aperçu des emails à supprimer ({analysisResult.deleteSamples.length} premiers) :
                </p>
                <ScrollArea className="h-[200px] rounded-md border p-3">
                  <div className="space-y-2">
                    {analysisResult.deleteSamples.map((email) => (
                      <div 
                        key={email.id}
                        className="p-2 rounded bg-muted/50 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{email.subject}</p>
                            <p className="text-xs text-muted-foreground truncate">{email.sender}</p>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {getSpamReasonLabel(email.reason)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Deletion complete */}
            {analysisResult.deleted > 0 && (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-lg font-bold">{analysisResult.deleted} emails supprimés !</p>
                    <p className="text-sm text-muted-foreground">
                      Le nettoyage est terminé. Vous pouvez maintenant resynchroniser Gmail.
                    </p>
                  </div>
                </div>
                {analysisResult.deletedByDomain.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Supprimés par domaine :</p>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.deletedByDomain.slice(0, 10).map(([domain, count]) => (
                        <Badge key={domain} variant="secondary" className="text-xs">
                          {domain}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Delete button */}
            {analysisResult.toDelete > 0 && analysisResult.deleted === 0 && (
              <Button
                variant="destructive"
                size="lg"
                className="w-full gap-2"
                onClick={() => purgeMode ? setShowPurgeDialog(true) : setShowConfirmDialog(true)}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Suppression en cours...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Supprimer {analysisResult.toDelete} emails
                  </>
                )}
              </Button>
            )}

            {/* Resync button after deletion */}
            {analysisResult.deleted > 0 && (
              <Button
                variant="outline"
                size="lg"
                className="w-full gap-2"
                onClick={() => navigate('/gmail-config')}
              >
                <RotateCcw className="h-4 w-4" />
                Aller à la configuration Gmail pour resynchroniser
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer définitivement <strong>{analysisResult?.toDelete || 0} emails</strong>.
              <br /><br />
              {analysisResult?.protected && analysisResult.protected > 0 && (
                <span className="text-blue-500">
                  ✓ {analysisResult.protected} emails liés à des incidents seront préservés.
                </span>
              )}
              <br /><br />
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Purge confirmation dialog (extra warning) */}
      <AlertDialog open={showPurgeDialog} onOpenChange={setShowPurgeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              ATTENTION - Purge Totale
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Vous êtes sur le point de <strong>SUPPRIMER TOUS VOS EMAILS</strong> ({analysisResult?.toDelete || 0} emails).
              </p>
              {analysisResult?.protected && analysisResult.protected > 0 && (
                <p className="text-blue-500">
                  ✓ Seuls {analysisResult.protected} emails liés à des incidents seront préservés.
                </p>
              )}
              <p className="font-bold text-destructive">
                Cette action est IRRÉVERSIBLE. Tous les emails, pièces jointes et analyses associées seront perdus.
              </p>
              <p>
                Êtes-vous absolument certain de vouloir continuer ?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Oui, supprimer TOUT
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
