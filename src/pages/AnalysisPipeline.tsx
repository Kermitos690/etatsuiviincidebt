import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Brain, 
  Play, 
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Quote,
  Clock,
  Loader2,
  RefreshCw,
  Mail,
  Paperclip,
  FileSearch,
  GitMerge,
  Shield,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Users,
  ExternalLink,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { EmailLink } from '@/components/email';
import { EmailPreview } from '@/components/analysis/EmailPreview';

interface AnalysisStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  details?: string;
  count?: number;
}

interface ThreadAnalysis {
  id: string;
  thread_id: string;
  email_ids: string[];
  chronological_summary: string | null;
  detected_issues: any[];
  citations: any[];
  participants: any;
  severity: string | null;
  confidence_score: number | null;
  analyzed_at: string;
}

interface Corroboration {
  id: string;
  incident_id: string | null;
  corroboration_type: string;
  supporting_evidence: any[];
  contradicting_evidence: any[];
  final_confidence: number | null;
  verification_status: string | null;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
}

interface EmailFact {
  id: string;
  email_id: string;
  sender_name: string | null;
  sender_email: string | null;
  recipients: string[];
  mentioned_persons: string[];
  mentioned_institutions: string[];
  mentioned_dates: string[];
  key_phrases: string[];
  action_items: string[];
  raw_citations: any[];
  urgency_level: string | null;
  sentiment: string | null;
}

export default function AnalysisPipeline() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pipeline');
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([
    { name: 'Resynchronisation emails', status: 'pending', progress: 0 },
    { name: 'Téléchargement pièces jointes', status: 'pending', progress: 0 },
    { name: 'Pass 1: Extraction des faits', status: 'pending', progress: 0 },
    { name: 'Pass 2: Analyse des threads', status: 'pending', progress: 0 },
    { name: 'Pass 3: Corroboration croisée', status: 'pending', progress: 0 },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedThread, setSelectedThread] = useState<ThreadAnalysis | null>(null);
  const [selectedCorroboration, setSelectedCorroboration] = useState<Corroboration | null>(null);
  const [useFilters, setUseFilters] = useState(true);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  // Callback for email preview
  const handlePreviewReady = useCallback((count: number) => {
    setPreviewCount(count);
  }, []);

  // Fetch Gmail config for filters
  const { data: gmailConfig } = useQuery({
    queryKey: ['gmail-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gmail_config')
        .select('domains, keywords')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch stats with filtered count
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['analysis-pipeline-stats', gmailConfig?.domains, gmailConfig?.keywords, useFilters],
    queryFn: async () => {
      // Base queries
      const [emailsRes, emailsEmptyRes, factsRes, threadsRes, corroborationsRes, attachmentsRes] = await Promise.all([
        supabase.from('emails').select('id', { count: 'exact', head: true }),
        supabase.from('emails').select('id', { count: 'exact', head: true }).or('body.is.null,body.eq.'),
        supabase.from('email_facts').select('id', { count: 'exact', head: true }),
        supabase.from('thread_analyses').select('id', { count: 'exact', head: true }),
        supabase.from('corroborations').select('id', { count: 'exact', head: true }),
        supabase.from('email_attachments').select('id', { count: 'exact', head: true }),
      ]);

      // Calculate filtered emails count
      let filteredCount = emailsRes.count || 0;
      const domains = gmailConfig?.domains || [];
      const keywords = gmailConfig?.keywords || [];
      const hasFilters = useFilters && (domains.length > 0 || keywords.length > 0);

      if (hasFilters) {
        let filteredQuery = supabase.from('emails').select('id', { count: 'exact', head: true });
        
        if (domains.length > 0) {
          const domainConditions = domains.map((d: string) => `sender.ilike.%${d}%`).join(',');
          filteredQuery = filteredQuery.or(domainConditions);
        }
        
        if (keywords.length > 0) {
          const keywordConditions = keywords.map((k: string) => `subject.ilike.%${k}%`).join(',');
          filteredQuery = filteredQuery.or(keywordConditions);
        }

        const { count } = await filteredQuery;
        filteredCount = count || 0;
      }

      return {
        emailsTotalSynced: emailsRes.count || 0,
        emailsMatchedFilters: filteredCount,
        emptyEmails: emailsEmptyRes.count || 0,
        factExtracted: factsRes.count || 0,
        threadsAnalyzed: threadsRes.count || 0,
        corroborations: corroborationsRes.count || 0,
        attachments: attachmentsRes.count || 0,
        filtersActive: hasFilters,
      };
    }
  });

  // Fetch thread analyses (paginated up to 500)
  const { data: threadAnalyses, isLoading: loadingThreads } = useQuery({
    queryKey: ['thread-analyses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('thread_analyses')
        .select('*')
        .order('analyzed_at', { ascending: false })
        .range(0, 499);
      
      if (error) throw error;
      return data as ThreadAnalysis[];
    }
  });

  // Fetch corroborations (paginated up to 500)
  const { data: corroborations, isLoading: loadingCorroborations } = useQuery({
    queryKey: ['corroborations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corroborations')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 499);
      
      if (error) throw error;
      return data as Corroboration[];
    }
  });

  // Fetch email facts (paginated up to 1000)
  const { data: emailFacts, isLoading: loadingFacts } = useQuery({
    queryKey: ['email-facts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_facts')
        .select('*')
        .order('extracted_at', { ascending: false })
        .range(0, 999);
      
      if (error) throw error;
      return data as EmailFact[];
    }
  });

  // Get filter body for Edge Functions
  const getFilterBody = () => {
    if (!useFilters) return {};
    const domains = gmailConfig?.domains || [];
    const keywords = gmailConfig?.keywords || [];
    if (domains.length === 0 && keywords.length === 0) return {};
    return { domains, keywords };
  };

  // Update step status
  const updateStep = (index: number, updates: Partial<AnalysisStep>) => {
    setAnalysisSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, ...updates } : step
    ));
  };

  // Run full analysis pipeline
  const runFullAnalysis = async () => {
    setIsRunning(true);
    const filterBody = getFilterBody();
    const hasFilters = Object.keys(filterBody).length > 0;
    
    if (hasFilters) {
      toast.info(`Analyse avec filtres: ${filterBody.domains?.join(', ') || 'tous domaines'} | ${filterBody.keywords?.join(', ') || 'tous mots-clés'}`);
    }
    
    try {
      // Step 1: Resync emails
      updateStep(0, { status: 'running', progress: 10 });
      toast.info('Étape 1/5: Resynchronisation des emails...');
      
      const resyncRes = await supabase.functions.invoke('resync-email-bodies', {
        body: { batchSize: 50 }
      });
      
      updateStep(0, { 
        status: 'completed', 
        progress: 100, 
        details: `${resyncRes.data?.updated || 0} emails mis à jour`,
        count: resyncRes.data?.updated || 0
      });

      // Step 2: Download attachments
      updateStep(1, { status: 'running', progress: 10 });
      toast.info('Étape 2/5: Téléchargement des pièces jointes...');
      
      const attachRes = await supabase.functions.invoke('download-all-attachments', {
        body: { batchSize: 50 }
      });
      
      updateStep(1, { 
        status: 'completed', 
        progress: 100, 
        details: `${attachRes.data?.downloaded || 0} pièces jointes`,
        count: attachRes.data?.downloaded || 0
      });

      // Step 3: Extract facts (Pass 1) - with filters
      updateStep(2, { status: 'running', progress: 10 });
      toast.info('Étape 3/5: Extraction des faits (Pass 1)...');
      
      const factsRes = await supabase.functions.invoke('extract-email-facts', {
        body: { batchSize: 50, ...filterBody }
      });
      
      updateStep(2, { 
        status: 'completed', 
        progress: 100, 
        details: `${factsRes.data?.results?.processed || 0} emails traités`,
        count: factsRes.data?.results?.processed || 0
      });

      // Step 4: Analyze threads (Pass 2) - with filters
      updateStep(3, { status: 'running', progress: 10 });
      toast.info('Étape 4/5: Analyse des threads (Pass 2)...');
      
      const threadRes = await supabase.functions.invoke('analyze-thread-complete', {
        body: { batchSize: 10, ...filterBody }
      });
      
      updateStep(3, { 
        status: 'completed', 
        progress: 100, 
        details: `${threadRes.data?.results?.analyzed || 0} threads analysés`,
        count: threadRes.data?.results?.analyzed || 0
      });

      // Step 5: Cross-reference (Pass 3) - with filters
      updateStep(4, { status: 'running', progress: 10 });
      toast.info('Étape 5/5: Corroboration croisée (Pass 3)...');
      
      const corrobRes = await supabase.functions.invoke('cross-reference-analysis', {
        body: { ...filterBody }
      });
      
      updateStep(4, { 
        status: 'completed', 
        progress: 100, 
        details: `${corrobRes.data?.results?.corroborations || 0} corroborations créées`,
        count: corrobRes.data?.results?.corroborations || 0
      });

      toast.success('Analyse complète terminée !');
      refetchStats();
      queryClient.invalidateQueries({ queryKey: ['thread-analyses'] });
      queryClient.invalidateQueries({ queryKey: ['corroborations'] });
      queryClient.invalidateQueries({ queryKey: ['email-facts'] });

    } catch (error) {
      console.error('Pipeline error:', error);
      toast.error('Erreur lors de l\'analyse');
      
      const runningStep = analysisSteps.findIndex(s => s.status === 'running');
      if (runningStep >= 0) {
        updateStep(runningStep, { status: 'error' });
      }
    } finally {
      setIsRunning(false);
    }
  };

  // Reset pipeline
  const resetPipeline = () => {
    setAnalysisSteps(prev => prev.map(step => ({ 
      ...step, 
      status: 'pending', 
      progress: 0, 
      details: undefined,
      count: undefined
    })));
  };

  // Verify corroboration
  const verifyCorroboration = async (id: string, status: 'verified' | 'rejected') => {
    try {
      await supabase
        .from('corroborations')
        .update({
          verification_status: status,
          verified_at: new Date().toISOString(),
          verified_by: 'user'
        })
        .eq('id', id);
      
      toast.success(status === 'verified' ? 'Corroboration validée' : 'Corroboration rejetée');
      queryClient.invalidateQueries({ queryKey: ['corroborations'] });
      setSelectedCorroboration(null);
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getSeverityColor = (severity?: string | null) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'critique': return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'high':
      case 'haute': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      case 'medium':
      case 'moyenne': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      default: return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'running': return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
              <Brain className="h-8 w-8" />
              Analyse Montre Suisse
            </h1>
            <p className="text-muted-foreground mt-1">
              Système d'analyse en 3 passes avec citations obligatoires et corroboration
            </p>
          </div>

          {/* Filter toggle and info */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 p-3 rounded-lg glass-card">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <Switch
                  id="use-filters"
                  checked={useFilters}
                  onCheckedChange={setUseFilters}
                />
                <Label htmlFor="use-filters" className="text-sm">
                  Utiliser les filtres Gmail
                </Label>
              </div>
            </div>
            {useFilters && gmailConfig && (gmailConfig.domains?.length > 0 || gmailConfig.keywords?.length > 0) && (
              <div className="text-xs text-muted-foreground px-2">
                <span className="text-primary">Domaines:</span> {gmailConfig.domains?.join(', ') || 'aucun'} |{' '}
                <span className="text-primary">Mots-clés:</span> {gmailConfig.keywords?.join(', ') || 'aucun'}
              </div>
            )}
            {useFilters && (!gmailConfig || (gmailConfig.domains?.length === 0 && gmailConfig.keywords?.length === 0)) && (
              <div className="text-xs text-yellow-500 px-2">
                Aucun filtre configuré - tous les emails seront analysés
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetchStats()}
              className="glass-card"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={resetPipeline}
              disabled={isRunning}
              className="glass-card"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
            <Button
              onClick={runFullAnalysis}
              disabled={isRunning}
              className="bg-gradient-primary text-white"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isRunning ? 'Analyse en cours...' : 'Lancer l\'analyse'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          {/* Total Synced */}
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-500/20">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.emailsTotalSynced || 0}</p>
                  <p className="text-xs text-muted-foreground">Total sync</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filtered Emails */}
          <Card className={`glass-card ${stats?.filtersActive ? 'border-primary/50' : ''}`}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Filter className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.emailsMatchedFilters || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats?.filtersActive ? 'Filtrés' : 'À analyser'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.emptyEmails || 0}</p>
                  <p className="text-xs text-muted-foreground">Vides</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <FileSearch className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.factExtracted || 0}</p>
                  <p className="text-xs text-muted-foreground">Faits</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <GitMerge className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.threadsAnalyzed || 0}</p>
                  <p className="text-xs text-muted-foreground">Threads</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Shield className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.corroborations || 0}</p>
                  <p className="text-xs text-muted-foreground">Corroborations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Paperclip className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.attachments || 0}</p>
                  <p className="text-xs text-muted-foreground">Pièces jointes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="glass-card">
            <TabsTrigger value="pipeline" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="facts" className="flex items-center gap-2">
              <FileSearch className="h-4 w-4" />
              Faits
            </TabsTrigger>
            <TabsTrigger value="threads" className="flex items-center gap-2">
              <GitMerge className="h-4 w-4" />
              Threads
            </TabsTrigger>
            <TabsTrigger value="corroborations" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Corroborations
            </TabsTrigger>
          </TabsList>

          {/* Pipeline Tab */}
          <TabsContent value="pipeline" className="space-y-4">
            {/* Email Preview Section */}
            <EmailPreview
              domains={gmailConfig?.domains || []}
              keywords={gmailConfig?.keywords || []}
              useFilters={useFilters}
              onPreviewReady={handlePreviewReady}
            />

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Pipeline d'Analyse en 3 Passes
                  {previewCount !== null && (
                    <Badge variant="secondary" className="ml-2">
                      {previewCount} emails ciblés
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Analyse ultra-factuelle avec citations obligatoires
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {analysisSteps.map((step, index) => (
                  <div key={step.name} className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      {getStatusIcon(step.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{step.name}</span>
                        {step.details && (
                          <Badge variant="outline" className="text-xs">
                            {step.details}
                          </Badge>
                        )}
                      </div>
                      <Progress value={step.progress} className="h-2" />
                    </div>
                    {step.status === 'completed' && step.count !== undefined && (
                      <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                        {step.count}
                      </Badge>
                    )}
                  </div>
                ))}

                <Separator />

                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Quote className="h-4 w-4" />
                    Règles d'Analyse
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Chaque affirmation = CITATION EXACTE obligatoire</li>
                    <li>• Pas de citation = pas d'affirmation</li>
                    <li>• ZÉRO supposition ou déduction</li>
                    <li>• Corroboration entre sources multiples</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Facts Tab */}
          <TabsContent value="facts" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSearch className="h-5 w-5" />
                  Faits Extraits (Pass 1)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingFacts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : emailFacts?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileSearch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun fait extrait. Lancez l'analyse.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {emailFacts?.slice(0, 20).map((fact) => (
                      <Card key={fact.id} className="bg-muted/30">
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs">Expéditeur</p>
                              <p className="font-medium truncate">{fact.sender_name || fact.sender_email || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Personnes</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {fact.mentioned_persons?.slice(0, 3).map((person, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    <Users className="h-3 w-3 mr-1" />
                                    {person}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Institutions</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {fact.mentioned_institutions?.slice(0, 2).map((inst, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {inst}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Urgence</p>
                              <Badge className={
                                fact.urgency_level === 'high' ? 'bg-red-500/20 text-red-500' :
                                fact.urgency_level === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                                'bg-green-500/20 text-green-500'
                              }>
                                {fact.urgency_level || 'normal'}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Threads Tab */}
          <TabsContent value="threads" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitMerge className="h-5 w-5" />
                  Analyses de Threads (Pass 2)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingThreads ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : threadAnalyses?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <GitMerge className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune analyse de thread.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {threadAnalyses?.map((thread) => (
                      <Card 
                        key={thread.id} 
                        className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedThread(thread)}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getSeverityColor(thread.severity)}>
                                  {thread.severity || 'N/A'}
                                </Badge>
                                <Badge variant="outline">
                                  {thread.email_ids?.length || 0} emails
                                </Badge>
                                {thread.confidence_score && (
                                  <Badge variant="secondary">
                                    {Math.round(thread.confidence_score)}%
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm line-clamp-2">
                                {thread.chronological_summary || 'Pas de résumé'}
                              </p>
                              {/* Email links */}
                              {thread.email_ids && thread.email_ids.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                                  {thread.email_ids.slice(0, 3).map((emailId, idx) => (
                                    <EmailLink
                                      key={emailId}
                                      emailId={emailId}
                                      label={`Email ${idx + 1}`}
                                      variant="outline"
                                      size="sm"
                                      className="text-xs"
                                    />
                                  ))}
                                  {thread.email_ids.length > 3 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{thread.email_ids.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Corroborations Tab */}
          <TabsContent value="corroborations" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Corroborations (Pass 3)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCorroborations ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : corroborations?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune corroboration.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {corroborations?.map((corr) => (
                      <Card 
                        key={corr.id} 
                        className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedCorroboration(corr)}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">
                                  {corr.corroboration_type}
                                </Badge>
                                {corr.final_confidence && (
                                  <Badge className={
                                    corr.final_confidence >= 80 ? 'bg-green-500/20 text-green-500' :
                                    corr.final_confidence >= 60 ? 'bg-yellow-500/20 text-yellow-500' :
                                    'bg-red-500/20 text-red-500'
                                  }>
                                    {Math.round(corr.final_confidence)}%
                                  </Badge>
                                )}
                                <Badge className={
                                  corr.verification_status === 'verified' ? 'bg-green-500/20 text-green-500' :
                                  corr.verification_status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                                  'bg-yellow-500/20 text-yellow-500'
                                }>
                                  {corr.verification_status === 'verified' ? 'Validé' :
                                   corr.verification_status === 'rejected' ? 'Rejeté' : 'En attente'}
                                </Badge>
                              </div>
                              <div className="flex gap-4 text-sm">
                                <span className="text-green-500">
                                  ✓ {(corr.supporting_evidence as any[])?.length || 0} preuves
                                </span>
                                <span className="text-red-500">
                                  ✗ {(corr.contradicting_evidence as any[])?.length || 0} contradictions
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {corr.verification_status === 'pending' && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="text-green-500 hover:text-green-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      verifyCorroboration(corr.id, 'verified');
                                    }}
                                  >
                                    <ThumbsUp className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="text-red-500 hover:text-red-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      verifyCorroboration(corr.id, 'rejected');
                                    }}
                                  >
                                    <ThumbsDown className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Thread Detail Dialog */}
        <Dialog open={!!selectedThread} onOpenChange={() => setSelectedThread(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitMerge className="h-5 w-5" />
                Analyse du Thread
              </DialogTitle>
            </DialogHeader>

            {selectedThread && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge className={getSeverityColor(selectedThread.severity)}>
                    {selectedThread.severity}
                  </Badge>
                  <Badge variant="outline">
                    {selectedThread.email_ids?.length || 0} emails
                  </Badge>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Résumé</h4>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">
                    {selectedThread.chronological_summary || 'Pas de résumé'}
                  </p>
                </div>

                {selectedThread.detected_issues && (selectedThread.detected_issues as any[]).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-500">Problèmes</h4>
                    <div className="space-y-2">
                      {(selectedThread.detected_issues as any[]).map((issue: any, i: number) => (
                        <div key={i} className="bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                          <p className="text-sm font-medium text-red-500">
                            {typeof issue === 'string' ? issue : issue.type || issue.title}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedThread.citations && (selectedThread.citations as any[]).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Quote className="h-4 w-4" />
                      Citations
                    </h4>
                    <div className="space-y-2">
                      {(selectedThread.citations as any[]).map((citation: any, i: number) => (
                        <div key={i} className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                          <p className="text-sm italic">
                            "{typeof citation === 'string' ? citation : citation.text}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Analysé le {format(new Date(selectedThread.analyzed_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Corroboration Detail Dialog */}
        <Dialog open={!!selectedCorroboration} onOpenChange={() => setSelectedCorroboration(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Corroboration
              </DialogTitle>
            </DialogHeader>

            {selectedCorroboration && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge variant="outline">{selectedCorroboration.corroboration_type}</Badge>
                  {selectedCorroboration.final_confidence && (
                    <Badge className={
                      selectedCorroboration.final_confidence >= 80 ? 'bg-green-500/20 text-green-500' :
                      selectedCorroboration.final_confidence >= 60 ? 'bg-yellow-500/20 text-yellow-500' :
                      'bg-red-500/20 text-red-500'
                    }>
                      {Math.round(selectedCorroboration.final_confidence)}%
                    </Badge>
                  )}
                </div>

                <Accordion type="single" collapsible>
                  <AccordionItem value="supporting">
                    <AccordionTrigger className="text-green-500">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Preuves ({(selectedCorroboration.supporting_evidence as any[])?.length || 0})
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {(selectedCorroboration.supporting_evidence as any[] || []).map((evidence: any, i: number) => (
                          <div key={i} className="bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                            <p className="text-sm">{typeof evidence === 'string' ? evidence : evidence.description || JSON.stringify(evidence)}</p>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="contradicting">
                    <AccordionTrigger className="text-red-500">
                      <span className="flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        Contradictions ({(selectedCorroboration.contradicting_evidence as any[])?.length || 0})
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {(selectedCorroboration.contradicting_evidence as any[] || []).map((evidence: any, i: number) => (
                          <div key={i} className="bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                            <p className="text-sm">{typeof evidence === 'string' ? evidence : evidence.description || JSON.stringify(evidence)}</p>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {selectedCorroboration.verification_status === 'pending' && (
                  <DialogFooter>
                    <Button 
                      variant="outline"
                      onClick={() => verifyCorroboration(selectedCorroboration.id, 'rejected')}
                      className="text-red-500"
                    >
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      Rejeter
                    </Button>
                    <Button 
                      onClick={() => verifyCorroboration(selectedCorroboration.id, 'verified')}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Valider
                    </Button>
                  </DialogFooter>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
