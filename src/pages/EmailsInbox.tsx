import { useState, useEffect, useMemo, useCallback } from 'react';
import { Inbox, RefreshCw, MessageSquare, Send, Layers } from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGmailFilters } from '@/hooks/useGmailFilters';
import { isEmailRelevant } from '@/utils/emailFilters';
import { useIsMobile } from '@/hooks/use-mobile';
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

export default function EmailsInbox() {
  const { user } = useAuth();
  const { data: gmailFilters } = useGmailFilters();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [showAllEmails, setShowAllEmails] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [alertEmail, setAlertEmail] = useState(() => localStorage.getItem('alertEmail') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [generatingResponse, setGeneratingResponse] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);
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

  // Group emails by thread
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

  useEffect(() => {
    if (user) fetchEmails();
    const channel = supabase.channel('emails-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'emails' }, () => fetchEmails()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchEmails]);

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

  const generateAIResponse = async (email: Email) => {
    if (!email.ai_analysis) return;
    setGeneratingResponse(true); setShowResponseDialog(true); setAiResponse('');
    try {
      const response = await supabase.functions.invoke('analyze-incident', { body: { type: 'generate-response', emailSubject: email.subject, emailSender: email.sender, emailBody: email.body, analysis: email.ai_analysis } });
      if (response.error) throw response.error;
      setAiResponse(response.data.response || 'Impossible de générer une réponse.');
    } catch (error) { toast.error('Erreur lors de la génération'); setAiResponse('Erreur. Réessayez.'); } finally { setGeneratingResponse(false); }
  };

  const sendResponse = async () => {
    if (!selectedEmail || !aiResponse) return;
    setSendingResponse(true);
    try {
      const { error } = await supabase.functions.invoke('send-email', { body: { to: selectedEmail.sender, subject: `Re: ${selectedEmail.subject}`, html: `<div style="font-family: Arial; padding: 20px;"><p>${aiResponse.replace(/\n/g, '<br/>')}</p></div>`, replyTo: alertEmail || undefined } });
      if (error) throw error;
      toast.success('Réponse envoyée !'); setShowResponseDialog(false); setAiResponse('');
    } catch (error: any) { toast.error(error.message || 'Erreur lors de l\'envoi'); } finally { setSendingResponse(false); }
  };

  const createIncidentFromEmail = async (email: Email) => {
    if (!email.ai_analysis) { toast.error('Pas d\'analyse IA'); return; }
    const analysis = email.ai_analysis;
    navigate('/nouveau', { state: { prefillData: { titre: analysis.suggestedTitle, faits: analysis.suggestedFacts, dysfonctionnement: analysis.suggestedDysfunction, institution: analysis.suggestedInstitution, type: analysis.suggestedType, gravite: analysis.suggestedGravity, emailSourceId: email.id } } });
  };

  const formatDate = (date: string) => {
    const d = new Date(date); const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const saveAlertEmail = () => { localStorage.setItem('alertEmail', alertEmail); setShowSettings(false); toast.success('Email d\'alerte enregistré'); };

  return (
    <AppLayout>
      <div className="flex flex-col h-full min-h-0 p-4 md:p-6 lg:p-8">

        <PageHeader 
          title="Boîte de réception" 
          description={`${stats.totalThreads} conversations • ${stats.totalEmails} emails`}
          icon={<Inbox className="h-7 w-7 text-white" />}
        />

        {/* Stats */}
        <div className="mt-4 mb-4">
          <EmailStats {...stats} />
        </div>

        {/* Toolbar */}
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
            onOpenSettings={() => setShowSettings(true)}
            isLoading={loading}
            isProcessing={processingThread !== null}
            stats={stats}
          />
        </div>

        {/* Main content - Responsive split view */}
        <div className="flex-1 min-h-0 grid lg:grid-cols-5 gap-4">
          {/* Thread list */}
          <div className={cn("lg:col-span-2 min-h-0", selectedEmail && isMobile && "hidden")}>
            {loading ? (
              <div className="glass-card p-8 text-center animate-pulse rounded-2xl">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                  <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-primary">
                    <RefreshCw className="h-8 w-8 text-white animate-spin" />
                  </div>
                </div>
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            ) : threads.length === 0 ? (
              <div className="glass-card p-8 text-center rounded-2xl">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-float">
                  <Inbox className="h-10 w-10 text-primary" />
                </div>
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
                      formatDate={formatDate}
                      animationDelay={Math.min(idx * 50, 300)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Email detail - Desktop */}
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
                onGenerateResponse={() => generateAIResponse(selectedEmail)}
                onAnalyzeAttachment={analyzeAttachment}
                onDownloadAttachment={downloadAttachment}
              />
            ) : (
              <div className="h-full glass-card rounded-2xl flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-20 h-20 rounded-3xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                    <Layers className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">Sélectionnez un email pour voir les détails</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile bottom sheet */}
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
            onGenerateResponse={() => selectedEmail && generateAIResponse(selectedEmail)}
            onAnalyzeAttachment={analyzeAttachment}
            onDownloadAttachment={downloadAttachment}
          />
        )}

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="glass-card border-border/50">
            <DialogHeader>
              <DialogTitle>Configuration</DialogTitle>
              <DialogDescription>Paramètres de la boîte de réception</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label>Email pour les alertes critiques</Label>
                <Input type="email" placeholder="votre@email.com" value={alertEmail} onChange={(e) => setAlertEmail(e.target.value)} className="bg-secondary/50 mt-1" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Création automatique d'incidents</Label>
                  <p className="text-xs text-muted-foreground">Confiance &gt;70%</p>
                </div>
                <Switch checked={autoProcessEnabled} onCheckedChange={setAutoProcessEnabled} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setShowSettings(false)}>Annuler</Button>
              <Button onClick={saveAlertEmail}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Response Dialog */}
        <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
          <DialogContent className="glass-card border-border/50 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />Réponse IA</DialogTitle>
              <DialogDescription>Vérifiez avant envoi à {selectedEmail?.sender}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {generatingResponse ? (
                <div className="flex items-center justify-center py-8"><RefreshCw className="h-8 w-8 animate-spin text-primary" /><span className="ml-3">Génération...</span></div>
              ) : (
                <Textarea value={aiResponse} onChange={(e) => setAiResponse(e.target.value)} className="min-h-[200px] bg-secondary/50" />
              )}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setShowResponseDialog(false)}>Annuler</Button>
              <Button onClick={sendResponse} disabled={generatingResponse || sendingResponse || !aiResponse}>
                {sendingResponse ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Envoyer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
