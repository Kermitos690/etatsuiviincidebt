import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Mail
} from 'lucide-react';

interface FilterCleanupPanelProps {
  gmailConfig: { domains: string[]; keywords: string[] } | null;
}

interface AnalysisResult {
  relevant: number;
  irrelevant: number;
  appliedFilters: {
    domains: string[];
    keywords: string[];
  };
  irrelevantSamples: {
    id: string;
    subject: string;
    sender: string;
    reason: string;
  }[];
  domainBreakdown: Record<string, number>;
}

export function FilterCleanupPanel({ gmailConfig }: FilterCleanupPanelProps) {
  const navigate = useNavigate();
  const [analyzing, setAnalyzing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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
        body: { dryRun: true, deleteEmails: false },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      // Calculate domain breakdown from irrelevant samples
      const domainBreakdown: Record<string, number> = {};
      (data.irrelevantEmails || []).forEach((email: any) => {
        const domain = email.sender?.match(/@([^>]+)/)?.[1] || 'unknown';
        domainBreakdown[domain] = (domainBreakdown[domain] || 0) + 1;
      });

      setAnalysisResult({
        relevant: data.relevantCount || 0,
        irrelevant: data.irrelevantCount || 0,
        appliedFilters: data.appliedFilters || { domains: [], keywords: [] },
        irrelevantSamples: (data.irrelevantEmails || []).slice(0, 50).map((e: any) => ({
          id: e.id,
          subject: e.subject || '(sans sujet)',
          sender: e.sender || 'unknown',
          reason: e.reason || 'Hors périmètre',
        })),
        domainBreakdown,
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

    try {
      const response = await supabase.functions.invoke('cleanup-emails', {
        body: { dryRun: false, deleteEmails: true },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      toast.success(`${data.deletedCount || 0} emails supprimés`);
      setAnalysisResult(null);
    } catch (error) {
      console.error('Error deleting emails:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  // Sort domain breakdown by count
  const sortedDomains = analysisResult 
    ? Object.entries(analysisResult.domainBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    : [];

  return (
    <div className="space-y-6">
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
            Les emails seront gardés uniquement s'ils correspondent à ces critères
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
                gmailConfig.domains.slice(0, 20).map((d, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{d}</Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground italic">Aucun domaine configuré</span>
              )}
              {(gmailConfig?.domains?.length || 0) > 20 && (
                <Badge variant="secondary" className="text-xs">+{gmailConfig!.domains.length - 20}</Badge>
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
                gmailConfig.keywords.slice(0, 20).map((k, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{k}</Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground italic">Aucun mot-clé configuré</span>
              )}
              {(gmailConfig?.keywords?.length || 0) > 20 && (
                <Badge variant="secondary" className="text-xs">+{gmailConfig!.keywords.length - 20}</Badge>
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
        >
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyse en cours...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Analyser tous les emails
            </>
          )}
        </Button>
      </div>

      {/* Analysis results */}
      {analysisResult && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Résultats de l'analyse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{analysisResult.relevant}</p>
                    <p className="text-sm text-muted-foreground">Emails pertinents</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                  <div>
                    <p className="text-2xl font-bold">{analysisResult.irrelevant}</p>
                    <p className="text-sm text-muted-foreground">Hors périmètre</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Domain breakdown */}
            {sortedDomains.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-3">Top domaines hors périmètre :</p>
                <div className="space-y-2">
                  {sortedDomains.map(([domain, count]) => (
                    <div key={domain} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate">{domain}</span>
                      <Badge variant="outline">{count} emails</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Email samples */}
            {analysisResult.irrelevantSamples.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-3">
                  Aperçu des emails à supprimer ({analysisResult.irrelevantSamples.length} premiers) :
                </p>
                <ScrollArea className="h-[200px] rounded-md border p-3">
                  <div className="space-y-2">
                    {analysisResult.irrelevantSamples.map((email) => (
                      <div 
                        key={email.id}
                        className="p-2 rounded bg-muted/50 text-sm"
                      >
                        <p className="font-medium truncate">{email.subject}</p>
                        <p className="text-xs text-muted-foreground truncate">{email.sender}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Delete button */}
            {analysisResult.irrelevant > 0 && (
              <Button
                variant="destructive"
                size="lg"
                className="w-full gap-2"
                onClick={() => setShowConfirmDialog(true)}
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
                    Supprimer {analysisResult.irrelevant} emails hors périmètre
                  </>
                )}
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
              Vous êtes sur le point de supprimer définitivement <strong>{analysisResult?.irrelevant || 0} emails</strong> qui ne correspondent pas à vos filtres.
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
    </div>
  );
}
