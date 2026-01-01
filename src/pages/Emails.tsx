import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Inbox, Mail, Layers, RefreshCw, Sparkles, Search, Filter, Trash2, Brain, AlertTriangle, CheckCircle, Clock, Link2, Eye, TrendingUp, Building2 } from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useGmailFilters } from '@/hooks/useGmailFilters';
import { isEmailRelevant } from '@/utils/emailFilters';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EmailLink } from '@/components/email';
import { FullReanalyzeDialog } from '@/components/analysis/FullReanalyzeDialog';
import { useQueryClient } from '@tanstack/react-query';
import {
  EmailCard,
  EmailDetail,
  EmailToolbar,
  EmailBottomSheet,
  EmailStats,
  Email,
  EmailThread,
  EmailAttachment,
} from '@/components/emails';

interface AIAnalysis {
  is_incident?: boolean;
  confidence?: number;
  title?: string;
  type?: string;
  severity?: string;
  institution?: string;
  summary?: string;
  facts?: string;
  dysfunction?: string;
  score?: number;
  legal_references?: string[];
}

interface AnalyzedEmail {
  id: string;
  subject: string;
  sender: string;
  received_at: string;
  ai_analysis: AIAnalysis | null;
  incident_id: string | null;
  processed: boolean;
  [key: string]: unknown;
}

export default function Emails() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'inbox';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: gmailFilters } = useGmailFilters();
  const isMobile = useIsMobile();

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // ============= INBOX STATE =============
  const [showAllEmails, setShowAllEmails] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [autoProcessEnabled, setAutoProcessEnabled] = useState(true);
  const [processingEmail, setProcessingEmail] = useState<string | null>(null);
  const [processingThread, setProcessingThread] = useState<string | null>(null);
  const [advancedAnalyzing, setAdvancedAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [viewMode, setViewMode] = useState<'threads' | 'list'>('threads');
  const [filterIncidents, setFilterIncidents] = useState(false);
  const [filterUnprocessed, setFilterUnprocessed] = useState(false);
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [analyzingAttachment, setAnalyzingAttachment] = useState<string | null>(null);

  // ============= ANALYZED STATE =============
  const [analyzedEmails, setAnalyzedEmails] = useState<AnalyzedEmail[]>([]);
  const [analyzedLoading, setAnalyzedLoading] = useState(true);
  const [analyzedSearchTerm, setAnalyzedSearchTerm] = useState('');
  const [selectedAnalyzedEmail, setSelectedAnalyzedEmail] = useState<AnalyzedEmail | null>(null);
  const [showReanalyze, setShowReanalyze] = useState(false);

  // ============= THREADS =============
  const threads = useMemo(() => {
    const threadMap = new Map<string, EmailThread>();
    
    emails.forEach(email => {
      const threadId = email.gmail_thread_id || email.id;
      
      if (!threadMap.has(threadId)) {
        threadMap.set(threadId, {
          threadId,
          subject: email.subject.replace(/^(Re:|Fwd:|TR:|RE:)\s*/gi, ''),
          emails: [],
          latestDate: email.received_at,
          participants: [],
          hasIncident: false,
          hasUnprocessed: false,
          avgConfidence: 0,
          institution: undefined
        });
      }
      
      const thread = threadMap.get(threadId)!;
      thread.emails.push(email);
      
      if (new Date(email.received_at) > new Date(thread.latestDate)) {
        thread.latestDate = email.received_at;
      }
      if (!thread.participants.includes(email.sender)) thread.participants.push(email.sender);
      if (email.recipient && !thread.participants.includes(email.recipient)) thread.participants.push(email.recipient);
      if (email.incident_id || email.ai_analysis?.isIncident) thread.hasIncident = true;
      if (!email.processed) thread.hasUnprocessed = true;
      if (email.ai_analysis?.suggestedInstitution) thread.institution = email.ai_analysis.suggestedInstitution;
    });
    
    threadMap.forEach(thread => {
      thread.emails.sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime());
      const confidences = thread.emails.filter(e => e.ai_analysis?.confidence).map(e => e.ai_analysis!.confidence);
      thread.avgConfidence = confidences.length > 0 ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length) : 0;
    });
    
    let threadsArray = Array.from(threadMap.values());
    threadsArray.sort((a, b) => {
      const dateA = new Date(a.latestDate).getTime();
      const dateB = new Date(b.latestDate).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      threadsArray = threadsArray.filter(t => 
        t.subject.toLowerCase().includes(query) ||
        t.participants.some(p => p.toLowerCase().includes(query)) ||
        t.institution?.toLowerCase().includes(query)
      );
    }
    if (filterIncidents) threadsArray = threadsArray.filter(t => t.hasIncident);
    if (filterUnprocessed) threadsArray = threadsArray.filter(t => t.hasUnprocessed);
    
    return threadsArray;
  }, [emails, sortOrder, searchQuery, filterIncidents, filterUnprocessed]);

  const stats = useMemo(() => ({
    totalEmails: emails.length,
    totalThreads: threads.length,
    incidents: emails.filter(e => e.incident_id || e.ai_analysis?.isIncident).length,
    unprocessed: emails.filter(e => !e.processed).length,
    avgConfidence: Math.round(
      emails.filter(e => e.ai_analysis?.confidence).reduce((acc, e) => acc + (e.ai_analysis?.confidence || 0), 0) / 
      (emails.filter(e => e.ai_analysis?.confidence).length || 1)
    )
  }), [emails, threads]);

  // ============= FETCH FUNCTIONS =============
  const fetchEmails = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from('emails').select('*').order('received_at', { ascending: false });
      if (error) throw error;
      const allEmails = (data || []) as unknown as Email[];
      const visibleEmails = !showAllEmails && gmailFilters ? allEmails.filter((e) => isEmailRelevant(e, gmailFilters)) : allEmails;
      setEmails(visibleEmails);
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast.error('Erreur lors du chargement des emails');
    } finally {
      setLoading(false);
    }
  }, [user, gmailFilters, showAllEmails]);

  const fetchAnalyzedEmails = useCallback(async () => {
    if (!user) { setAnalyzedLoading(false); return; }
    setAnalyzedLoading(true);
    try {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .not('ai_analysis', 'is', null)
        .order('received_at', { ascending: false });
      if (error) throw error;
      setAnalyzedEmails((data || []).map(item => ({
        ...item,
        ai_analysis: item.ai_analysis as AIAnalysis | null
      })) as AnalyzedEmail[]);
    } catch (error) {
      console.error('Error fetching analyzed emails:', error);
    } finally {
      setAnalyzedLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchEmails();
      fetchAnalyzedEmails();
    }
    const channel = supabase.channel('emails-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'emails' }, () => {
      fetchEmails();
      fetchAnalyzedEmails();
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchEmails, fetchAnalyzedEmails]);

  // ============= INBOX HANDLERS =============
  const fetchAttachments = async (emailId: string) => {
    setLoadingAttachments(true);
    try {
      const { data, error } = await supabase.from('email_attachments').select('*').eq('email_id', emailId).order('created_at', { ascending: true });
      if (error) throw error;
      setAttachments((data || []) as unknown as EmailAttachment[]);
    } catch (error) { setAttachments([]); } finally { setLoadingAttachments(false); }
  };

  useEffect(() => {
    if (selectedEmail) fetchAttachments(selectedEmail.id);
    else setAttachments([]);
  }, [selectedEmail?.id]);

  const analyzeAttachment = async (attachmentId: string) => {
    setAnalyzingAttachment(attachmentId);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-attachment', { body: { attachmentId } });
      if (error) throw error;
      if (data?.success) { toast.success('Pièce jointe analysée'); if (selectedEmail) fetchAttachments(selectedEmail.id); }
    } catch (error) { toast.error('Erreur lors de l\'analyse'); } finally { setAnalyzingAttachment(null); }
  };

  const downloadAttachment = async (attachment: EmailAttachment) => {
    try {
      const { data, error } = await supabase.storage.from('email-attachments').download(attachment.storage_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a'); a.href = url; a.download = attachment.filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (error) { toast.error('Erreur lors du téléchargement'); }
  };

  const analyzeThread = async (thread: EmailThread) => {
    setProcessingThread(thread.threadId);
    try {
      const emailsToAnalyze = thread.emails.filter(e => !e.processed);
      for (const email of emailsToAnalyze) {
        await supabase.functions.invoke('auto-process-email', { body: { emailId: email.id, autoCreate: autoProcessEnabled, confidenceThreshold: 70 } });
      }
      if (thread.emails.length > 1) {
        await supabase.functions.invoke('analyze-thread', { body: { threadId: thread.threadId, messages: thread.emails.map(e => ({ date: e.received_at, sender: e.sender, subject: e.subject, body: e.body })) } });
      }
      toast.success(`Thread analysé (${emailsToAnalyze.length} emails)`);
      fetchEmails();
    } catch (error) { toast.error('Erreur lors de l\'analyse du thread'); } finally { setProcessingThread(null); }
  };

  const analyzeAllThreads = async () => {
    const threadsToAnalyze = threads.filter(t => t.hasUnprocessed);
    if (threadsToAnalyze.length === 0) { toast.info('Aucun thread à analyser'); return; }
    toast.info(`Analyse de ${threadsToAnalyze.length} threads...`);
    for (const thread of threadsToAnalyze) await analyzeThread(thread);
    toast.success('Analyse globale terminée !');
  };

  const processEmailWithAI = async (email: Email) => {
    setProcessingEmail(email.id);
    try {
      const { data, error } = await supabase.functions.invoke('auto-process-email', { body: { emailId: email.id, autoCreate: autoProcessEnabled, confidenceThreshold: 70 } });
      if (error) throw error;
      if (data?.incidentCreated) toast.success(`Incident #${data.incident?.numero} créé !`);
      else if (data?.analysis) toast.success('Analyse terminée');
      fetchEmails();
    } catch (error) { toast.error('Erreur lors de l\'analyse'); } finally { setProcessingEmail(null); }
  };

  const runAdvancedAnalysis = async (email: Email) => {
    setAdvancedAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-email-advanced', { body: { emailId: email.id, threadId: email.gmail_thread_id, analyzeThread: !!email.gmail_thread_id } });
      if (error) throw error;
      if (data?.success) { toast.success('Analyse approfondie terminée'); fetchEmails(); if (selectedEmail?.id === email.id) setSelectedEmail(prev => prev ? { ...prev, thread_analysis: data.analysis } : null); }
    } catch (error) { toast.error('Erreur lors de l\'analyse approfondie'); } finally { setAdvancedAnalyzing(false); }
  };

  const createIncidentFromEmail = async (email: Email) => {
    if (!email.ai_analysis) { toast.error('Pas d\'analyse IA'); return; }
    const analysis = email.ai_analysis;
    navigate('/nouveau', { state: { prefillData: { titre: analysis.suggestedTitle, faits: analysis.suggestedFacts, dysfonctionnement: analysis.suggestedDysfunction, institution: analysis.suggestedInstitution, type: analysis.suggestedType, gravite: analysis.suggestedGravity, emailSourceId: email.id } } });
  };

  const deleteEmail = async (email: Email) => {
    if (!confirm(`Supprimer l'email "${email.subject}" ?`)) return;
    try {
      const { error } = await supabase.from('emails').delete().eq('id', email.id);
      if (error) throw error;
      toast.success('Email supprimé');
      setEmails(prev => prev.filter(e => e.id !== email.id));
      if (selectedEmail?.id === email.id) {
        setSelectedEmail(null);
        setSelectedThread(null);
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const deleteThread = async (thread: EmailThread) => {
    if (!confirm(`Supprimer ${thread.emails.length} email(s) de ce thread ?`)) return;
    try {
      const ids = thread.emails.map(e => e.id);
      const { error } = await supabase.from('emails').delete().in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} email(s) supprimé(s)`);
      setEmails(prev => prev.filter(e => !ids.includes(e.id)));
      if (selectedThread?.threadId === thread.threadId) {
        setSelectedEmail(null);
        setSelectedThread(null);
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date); const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  // ============= ANALYZED HANDLERS =============
  const filteredAnalyzedEmails = useMemo(() => {
    let result = analyzedEmails;
    if (!showAllEmails && gmailFilters) {
      result = result.filter(e => isEmailRelevant(e as any, gmailFilters));
    }
    if (analyzedSearchTerm) {
      const s = analyzedSearchTerm.toLowerCase();
      result = result.filter(e => 
        e.subject.toLowerCase().includes(s) ||
        e.sender.toLowerCase().includes(s) ||
        e.ai_analysis?.institution?.toLowerCase().includes(s) ||
        e.ai_analysis?.type?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [analyzedEmails, gmailFilters, showAllEmails, analyzedSearchTerm]);

  const analyzedStats = {
    total: analyzedEmails.length,
    incidents: analyzedEmails.filter(e => e.ai_analysis?.is_incident).length,
    highConfidence: analyzedEmails.filter(e => (e.ai_analysis?.confidence || 0) >= 80).length,
    linked: analyzedEmails.filter(e => e.incident_id).length
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-500';
    if (confidence >= 60) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const deleteAnalyzedEmail = async (email: AnalyzedEmail) => {
    if (!confirm(`Supprimer l'email "${email.subject}" ?`)) return;
    try {
      const { error } = await supabase.from('emails').delete().eq('id', email.id);
      if (error) throw error;
      toast.success('Email supprimé');
      setAnalyzedEmails(prev => prev.filter(e => e.id !== email.id));
      if (selectedAnalyzedEmail?.id === email.id) setSelectedAnalyzedEmail(null);
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full min-h-0 p-4 md:p-6 lg:p-8">
        <PageHeader 
          title="Emails" 
          description={`${stats.totalThreads} conversations • ${analyzedStats.total} analysés`}
          icon={<Mail className="h-7 w-7 text-white" />}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4 flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start bg-muted/50 p-1 rounded-xl mb-4">
            <TabsTrigger value="inbox" className="flex items-center gap-2 data-[state=active]:bg-background">
              <Inbox className="h-4 w-4" />
              Inbox
              {stats.unprocessed > 0 && <Badge variant="secondary" className="ml-1">{stats.unprocessed}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="analyzed" className="flex items-center gap-2 data-[state=active]:bg-background">
              <Brain className="h-4 w-4" />
              Analysés
              <Badge variant="outline" className="ml-1">{analyzedStats.total}</Badge>
            </TabsTrigger>
            <TabsTrigger value="cleanup" className="flex items-center gap-2 data-[state=active]:bg-background" onClick={() => navigate('/email-cleanup')}>
              <Layers className="h-4 w-4" />
              Nettoyage
            </TabsTrigger>
          </TabsList>

          {/* ============= INBOX TAB ============= */}
          <TabsContent value="inbox" className="flex-1 flex flex-col min-h-0 mt-0">
            <div className="mb-4">
              <EmailStats {...stats} />
            </div>

            <div className="glass-card p-4 mb-4 rounded-2xl">
              <EmailToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                filterIncidents={filterIncidents}
                onFilterIncidentsChange={setFilterIncidents}
                filterUnprocessed={filterUnprocessed}
                onFilterUnprocessedChange={setFilterUnprocessed}
                showAllEmails={showAllEmails}
                onShowAllEmailsChange={setShowAllEmails}
                onRefresh={fetchEmails}
                onAnalyzeAll={analyzeAllThreads}
                onOpenSettings={() => {}}
                isLoading={loading}
                isProcessing={processingThread !== null}
                stats={stats}
              />
            </div>

            <div className="flex-1 min-h-0 grid lg:grid-cols-5 gap-4">
              <div className={cn("lg:col-span-2 min-h-0", selectedEmail && isMobile && "hidden")}>
                {loading ? (
                  <div className="glass-card p-8 text-center animate-pulse rounded-2xl">
                    <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
                    <p className="text-muted-foreground">Chargement...</p>
                  </div>
                ) : threads.length === 0 ? (
                  <div className="glass-card p-8 text-center rounded-2xl">
                    <Inbox className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-lg font-medium mb-2">Aucun email</p>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery || filterIncidents || filterUnprocessed ? 'Aucun résultat' : 'Configurez Gmail pour synchroniser'}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-full pr-2">
                    <div className="space-y-3 pb-20 lg:pb-4">
                      {threads.map((thread, idx) => (
                        <EmailCard
                          key={thread.threadId}
                          thread={thread}
                          isSelected={selectedThread?.threadId === thread.threadId}
                          isExpanded={expandedThreads.has(thread.threadId)}
                          isProcessing={processingThread === thread.threadId}
                          onSelect={() => { setSelectedThread(thread); setSelectedEmail(thread.emails[thread.emails.length - 1]); }}
                          onToggle={() => setExpandedThreads(prev => { const next = new Set(prev); next.has(thread.threadId) ? next.delete(thread.threadId) : next.add(thread.threadId); return next; })}
                          onAnalyze={() => analyzeThread(thread)}
                          onView={() => { setSelectedThread(thread); setSelectedEmail(thread.emails[thread.emails.length - 1]); }}
                          onDelete={() => deleteThread(thread)}
                          formatDate={formatDate}
                          animationDelay={Math.min(idx * 50, 300)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              <div className="hidden lg:block lg:col-span-3 min-h-0">
                {selectedEmail ? (
                  <EmailDetail
                    email={selectedEmail}
                    attachments={attachments}
                    loadingAttachments={loadingAttachments}
                    analyzingAttachment={analyzingAttachment}
                    isProcessing={processingEmail === selectedEmail.id}
                    isAdvancedAnalyzing={advancedAnalyzing}
                    onClose={() => setSelectedEmail(null)}
                    onAnalyze={() => processEmailWithAI(selectedEmail)}
                    onAdvancedAnalyze={() => runAdvancedAnalysis(selectedEmail)}
                    onCreateIncident={() => createIncidentFromEmail(selectedEmail)}
                    onGenerateResponse={() => {}}
                    onAnalyzeAttachment={analyzeAttachment}
                    onDownloadAttachment={downloadAttachment}
                    onDelete={() => deleteEmail(selectedEmail)}
                  />
                ) : (
                  <div className="h-full glass-card rounded-2xl flex items-center justify-center">
                    <div className="text-center p-8">
                      <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">Sélectionnez un email pour voir les détails</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {isMobile && (
              <EmailBottomSheet
                email={selectedEmail}
                attachments={attachments}
                loadingAttachments={loadingAttachments}
                analyzingAttachment={analyzingAttachment}
                isProcessing={processingEmail === selectedEmail?.id}
                isAdvancedAnalyzing={advancedAnalyzing}
                onClose={() => setSelectedEmail(null)}
                onAnalyze={() => selectedEmail && processEmailWithAI(selectedEmail)}
                onAdvancedAnalyze={() => selectedEmail && runAdvancedAnalysis(selectedEmail)}
                onCreateIncident={() => selectedEmail && createIncidentFromEmail(selectedEmail)}
                onGenerateResponse={() => {}}
                onAnalyzeAttachment={analyzeAttachment}
                onDownloadAttachment={downloadAttachment}
                onDelete={() => selectedEmail && deleteEmail(selectedEmail)}
              />
            )}
          </TabsContent>

          {/* ============= ANALYZED TAB ============= */}
          <TabsContent value="analyzed" className="flex-1 flex flex-col min-h-0 mt-0 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Button
                  variant={!showAllEmails ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setShowAllEmails(false)}
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Pertinents
                </Button>
                <Button
                  variant={showAllEmails ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setShowAllEmails(true)}
                >
                  Tous
                </Button>
              </div>
              <Button onClick={() => setShowReanalyze(true)} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Réanalyse Complète
              </Button>
            </div>

            <FullReanalyzeDialog 
              open={showReanalyze} 
              onOpenChange={setShowReanalyze}
              onComplete={() => { fetchAnalyzedEmails(); queryClient.invalidateQueries({ queryKey: ['analyzed-emails'] }); }}
            />

            <div className="grid gap-4 md:grid-cols-4">
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total analysés</p>
                      <p className="text-2xl font-bold">{analyzedStats.total}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Incidents détectés</p>
                      <p className="text-2xl font-bold">{analyzedStats.incidents}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-destructive/10">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Haute confiance</p>
                      <p className="text-2xl font-bold">{analyzedStats.highConfidence}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-green-500/10">
                      <Brain className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Liés à incidents</p>
                      <p className="text-2xl font-bold">{analyzedStats.linked}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-500/10">
                      <Link2 className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par sujet, expéditeur, institution, type..."
                    value={analyzedSearchTerm}
                    onChange={(e) => setAnalyzedSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card flex-1 overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Emails Analysés ({filteredAnalyzedEmails.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-auto">
                {analyzedLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredAnalyzedEmails.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun email analysé trouvé</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Sujet</TableHead>
                        <TableHead className="hidden md:table-cell">Institution</TableHead>
                        <TableHead className="hidden lg:table-cell">Type</TableHead>
                        <TableHead>Confiance</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAnalyzedEmails.map((email) => (
                        <TableRow key={email.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(email.received_at), 'dd/MM/yyyy', { locale: fr })}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate font-medium">
                            {email.subject}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {email.ai_analysis?.institution && (
                              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                <Building2 className="h-3 w-3" />
                                {email.ai_analysis.institution}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {email.ai_analysis?.type && <Badge variant="secondary">{email.ai_analysis.type}</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={email.ai_analysis?.confidence || 0} className="w-16 h-2" />
                              <span className={`text-sm font-medium ${getConfidenceColor(email.ai_analysis?.confidence || 0)}`}>
                                {email.ai_analysis?.confidence || 0}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {email.ai_analysis?.is_incident ? (
                              email.incident_id ? (
                                <Badge variant="default" className="flex items-center gap-1 w-fit">
                                  <CheckCircle className="h-3 w-3" />Lié
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                  <AlertTriangle className="h-3 w-3" />Incident
                                </Badge>
                              )
                            ) : (
                              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                <Clock className="h-3 w-3" />Normal
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <EmailLink emailId={email.id} label="" variant="cta" size="icon" showIcon tooltip="Voir l'email" />
                              <Button variant="ghost" size="sm" onClick={() => setSelectedAnalyzedEmail(email)} title="Voir l'analyse">
                                <Brain className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteAnalyzedEmail(email)} className="hover:bg-destructive/10 hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Dialog open={!!selectedAnalyzedEmail} onOpenChange={() => setSelectedAnalyzedEmail(null)}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Analyse IA de l'email
                  </DialogTitle>
                </DialogHeader>
                {selectedAnalyzedEmail?.ai_analysis && (
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="pt-4 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Sujet:</span><span className="font-medium">{selectedAnalyzedEmail.subject}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Expéditeur:</span><span>{selectedAnalyzedEmail.sender}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Date:</span><span>{format(new Date(selectedAnalyzedEmail.received_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}</span></div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Résultat de l'analyse</CardTitle>
                          <Badge className={getConfidenceColor(selectedAnalyzedEmail.ai_analysis.confidence || 0)}>
                            {selectedAnalyzedEmail.ai_analysis.confidence}%
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div><p className="text-sm text-muted-foreground mb-1">Titre détecté</p><p className="font-medium">{selectedAnalyzedEmail.ai_analysis.title}</p></div>
                          <div><p className="text-sm text-muted-foreground mb-1">Institution</p><Badge variant="outline">{selectedAnalyzedEmail.ai_analysis.institution}</Badge></div>
                          <div><p className="text-sm text-muted-foreground mb-1">Type</p><Badge variant="secondary">{selectedAnalyzedEmail.ai_analysis.type}</Badge></div>
                          <div><p className="text-sm text-muted-foreground mb-1">Gravité</p><Badge variant="secondary">{selectedAnalyzedEmail.ai_analysis.severity}</Badge></div>
                        </div>
                        {selectedAnalyzedEmail.ai_analysis.summary && (
                          <div><p className="text-sm text-muted-foreground mb-1">Résumé</p><p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedAnalyzedEmail.ai_analysis.summary}</p></div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* CLEANUP TAB redirects */}
          <TabsContent value="cleanup" className="flex-1">
            <div className="text-center py-8">
              <p>Redirection vers la page de nettoyage...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
