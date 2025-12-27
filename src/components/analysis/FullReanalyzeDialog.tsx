import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  RefreshCw, 
  Mail, 
  Brain, 
  FileText, 
  MessageSquare, 
  AlertTriangle,
  CheckCircle2,
  Loader2,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface ReanalyzeProgress {
  step: string;
  stepNumber: number;
  totalSteps: number;
  current: number;
  total: number;
  errors: string[];
  stats: {
    emailsSynced: number;
    emailsAnalyzed: number;
    factsExtracted: number;
    threadsAnalyzed: number;
    incidentsCreated: number;
  };
}

interface FullReanalyzeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

const STEPS = [
  { id: 1, label: 'Synchronisation Gmail', icon: Mail },
  { id: 2, label: 'Analyse des emails', icon: Brain },
  { id: 3, label: 'Extraction des faits', icon: FileText },
  { id: 4, label: 'Analyse des threads', icon: MessageSquare },
  { id: 5, label: 'Finalisation', icon: CheckCircle2 },
];

export function FullReanalyzeDialog({ 
  open, 
  onOpenChange,
  onComplete 
}: FullReanalyzeDialogProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [syncGmail, setSyncGmail] = useState(true);
  const [forceReanalyze, setForceReanalyze] = useState(true);
  const [syncId, setSyncId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ReanalyzeProgress | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  // Poll for progress updates
  useEffect(() => {
    if (!syncId || !isRunning) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('sync_status')
        .select('stats, status')
        .eq('id', syncId)
        .maybeSingle();

      if (data?.stats) {
        setProgress(data.stats as unknown as ReanalyzeProgress);
        
        if (data.status === 'completed' || data.status === 'completed_with_errors') {
          setIsRunning(false);
          setIsComplete(true);
          clearInterval(interval);
          
          if (data.status === 'completed') {
            toast.success('Réanalyse complète terminée !');
          } else {
            toast.warning('Réanalyse terminée avec des erreurs');
          }
          
          onComplete?.();
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [syncId, isRunning, onComplete]);

  const startReanalyze = async () => {
    setIsRunning(true);
    setIsComplete(false);
    setProgress(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Vous devez être connecté');
        setIsRunning(false);
        return;
      }

      const { data: result, error } = await supabase.functions.invoke('full-reanalyze', {
        body: { syncGmail, forceReanalyze },
      });

      if (error) {
        throw new Error(error.message || 'Erreur lors de la réanalyse');
      }

      if (result.syncId) {
        setSyncId(result.syncId);
      }

      // If no syncId, the function completed synchronously
      if (result.progress) {
        setProgress(result.progress);
        setIsComplete(true);
        setIsRunning(false);
        toast.success('Réanalyse complète terminée !');
        onComplete?.();
      }
    } catch (error) {
      console.error('Reanalyze error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la réanalyse');
      setIsRunning(false);
    }
  };

  const getStepStatus = (stepId: number) => {
    if (!progress) return 'pending';
    if (stepId < progress.stepNumber) return 'completed';
    if (stepId === progress.stepNumber) return 'active';
    return 'pending';
  };

  const getProgressPercent = () => {
    if (!progress) return 0;
    const stepProgress = ((progress.stepNumber - 1) / progress.totalSteps) * 100;
    const withinStep = progress.total > 0 
      ? (progress.current / progress.total) * (100 / progress.totalSteps)
      : 0;
    return Math.min(stepProgress + withinStep, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Réanalyse Complète
          </DialogTitle>
          <DialogDescription>
            Lance une synchronisation Gmail suivie d'une analyse complète de tous les emails, faits et threads.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Options */}
          {!isRunning && !isComplete && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="sync-gmail" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Synchroniser Gmail d'abord
                </Label>
                <Switch 
                  id="sync-gmail" 
                  checked={syncGmail}
                  onCheckedChange={setSyncGmail}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="force-reanalyze" className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Forcer réanalyse de tous les emails
                </Label>
                <Switch 
                  id="force-reanalyze" 
                  checked={forceReanalyze}
                  onCheckedChange={setForceReanalyze}
                />
              </div>
            </div>
          )}

          {/* Progress */}
          {(isRunning || isComplete) && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {progress?.step || 'Démarrage...'}
                  </span>
                  <span className="font-medium">
                    {Math.round(getProgressPercent())}%
                  </span>
                </div>
                <Progress value={getProgressPercent()} className="h-2" />
                {progress && progress.total > 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    {progress.current} / {progress.total}
                  </p>
                )}
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {STEPS.map((step) => {
                  const status = getStepStatus(step.id);
                  const Icon = step.icon;
                  
                  return (
                    <div 
                      key={step.id}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        status === 'active' ? 'bg-primary/10' :
                        status === 'completed' ? 'bg-green-500/10' :
                        'bg-muted/30'
                      }`}
                    >
                      <div className={`p-1.5 rounded-full ${
                        status === 'active' ? 'bg-primary/20' :
                        status === 'completed' ? 'bg-green-500/20' :
                        'bg-muted'
                      }`}>
                        {status === 'active' ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : status === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className={`text-sm ${
                        status === 'active' ? 'font-medium' :
                        status === 'completed' ? 'text-green-600' :
                        'text-muted-foreground'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Stats */}
              {progress?.stats && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="text-center p-2 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold">{progress.stats.emailsSynced}</p>
                    <p className="text-xs text-muted-foreground">Emails sync</p>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold">{progress.stats.emailsAnalyzed}</p>
                    <p className="text-xs text-muted-foreground">Analysés</p>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold">{progress.stats.factsExtracted}</p>
                    <p className="text-xs text-muted-foreground">Faits</p>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold">{progress.stats.threadsAnalyzed}</p>
                    <p className="text-xs text-muted-foreground">Threads</p>
                  </div>
                  <div className="col-span-2 text-center p-2 bg-destructive/10 rounded-lg">
                    <p className="text-lg font-bold text-destructive">
                      {progress.stats.incidentsCreated}
                    </p>
                    <p className="text-xs text-muted-foreground">Incidents créés</p>
                  </div>
                </div>
              )}

              {/* Errors */}
              {progress?.errors && progress.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    Erreurs ({progress.errors.length})
                  </p>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {progress.errors.map((err, i) => (
                      <p key={i} className="text-xs text-muted-foreground bg-destructive/10 p-1 rounded">
                        {err}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {!isRunning && !isComplete && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button onClick={startReanalyze}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Lancer la réanalyse
              </Button>
            </>
          )}
          
          {isRunning && (
            <Button disabled variant="outline">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              En cours...
            </Button>
          )}
          
          {isComplete && (
            <Button onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
