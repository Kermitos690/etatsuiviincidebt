import { useState, useEffect, useMemo } from 'react';
import { 
  Mail, Sparkles, Check, X, RefreshCw, AlertTriangle, ArrowRight, Clock, Brain, Send, 
  MessageSquare, Settings, Zap, Play, Scale, ChevronDown, ChevronRight, Layers, 
  Filter, Search, BarChart3, TrendingUp, Users, Building2, Inbox, Archive, Trash2,
  LayoutGrid, List, SortAsc, SortDesc, Maximize2, Minimize2, Eye, EyeOff, Paperclip,
  FileText, Image, File, Download, Loader2
} from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Email {
  id: string;
  subject: string;
  sender: string;
  recipient?: string;
  body: string;
  received_at: string;
  processed: boolean;
  is_sent?: boolean;
  email_type?: 'received' | 'sent' | 'replied' | 'forwarded';
  ai_analysis: {
    isIncident: boolean;
    confidence: number;
    suggestedTitle: string;
    suggestedFacts: string;
    suggestedDysfunction: string;
    suggestedInstitution: string;
    suggestedType: string;
    suggestedGravity: string;
    summary: string;
    suggestedResponse?: string;
  } | null;
  thread_analysis: AdvancedAnalysis | null;
  incident_id: string | null;
  gmail_thread_id?: string;
  created_at: string;
  attachments?: EmailAttachment[];
}

interface EmailAttachment {
  id: string;
  email_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  ai_analysis: {
    document_type: string;
    key_elements: string[];
    institutions_mentioned: string[];
    dates_found: string[];
    problems_detected: string[];
    legal_implications: string;
    summary: string;
    severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
  } | null;
  analyzed_at: string | null;
  extracted_text: string | null;
  created_at: string;
}

interface LegalReference {
  article: string;
  law: string;
  description: string;
  source_url?: string;
}

interface AdvancedAnalysis {
  deadline_violations: {
    detected: boolean;
    details: string[];
    missed_deadlines: string[];
    severity: "none" | "low" | "medium" | "high" | "critical";
    legal_basis?: LegalReference[];
  };
  unanswered_questions: {
    detected: boolean;
    questions: string[];
    waiting_since: string[];
    legal_basis?: LegalReference[];
  };
  repetitions: {
    detected: boolean;
    repeated_requests: string[];
    count: number;
    legal_basis?: LegalReference[];
  };
  contradictions: {
    detected: boolean;
    details: string[];
    conflicting_statements: Array<{ statement1: string; statement2: string; source1?: string; source2?: string }>;
    legal_basis?: LegalReference[];
  };
  rule_violations: {
    detected: boolean;
    violations: string[];
    rules_concerned: string[];
    legal_references: string[];
    legal_basis?: LegalReference[];
  };
  circumvention: {
    detected: boolean;
    details: string[];
    evasive_responses: string[];
    legal_basis?: LegalReference[];
  };
  problem_score: number;
  summary: string;
  recommendations: string[];
  confidence: "High" | "Medium" | "Low";
  all_legal_references?: LegalReference[];
}

interface EmailThread {
  threadId: string;
  subject: string;
  emails: Email[];
  latestDate: string;
  participants: string[];
  hasIncident: boolean;
  hasUnprocessed: boolean;
  avgConfidence: number;
  institution?: string;
}

export default function EmailsInbox() {
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
  const [deepAnalyzing, setDeepAnalyzing] = useState(false);
  const [deepAnalysisProgress, setDeepAnalysisProgress] = useState<{
    analyzed: number;
    total: number;
    incidents: number;
    newPatterns: number;
    repeatedPatterns: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [viewMode, setViewMode] = useState<'threads' | 'list'>('threads');
  const [filterIncidents, setFilterIncidents] = useState(false);
  const [filterUnprocessed, setFilterUnprocessed] = useState(false);
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [analyzingAttachment, setAnalyzingAttachment] = useState<string | null>(null);
  const navigate = useNavigate();

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
      
      // Update thread metadata
      if (new Date(email.received_at) > new Date(thread.latestDate)) {
        thread.latestDate = email.received_at;
      }
      
      if (!thread.participants.includes(email.sender)) {
        thread.participants.push(email.sender);
      }
      if (email.recipient && !thread.participants.includes(email.recipient)) {
        thread.participants.push(email.recipient);
      }
      
      if (email.incident_id || email.ai_analysis?.isIncident) {
        thread.hasIncident = true;
      }
      
      if (!email.processed) {
        thread.hasUnprocessed = true;
      }
      
      if (email.ai_analysis?.suggestedInstitution) {
        thread.institution = email.ai_analysis.suggestedInstitution;
      }
    });
    
    // Calculate average confidence and sort emails within threads
    threadMap.forEach(thread => {
      thread.emails.sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime());
      const confidences = thread.emails
        .filter(e => e.ai_analysis?.confidence)
        .map(e => e.ai_analysis!.confidence);
      thread.avgConfidence = confidences.length > 0 
        ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length) 
        : 0;
    });
    
    // Convert to array and sort
    let threadsArray = Array.from(threadMap.values());
    threadsArray.sort((a, b) => {
      const dateA = new Date(a.latestDate).getTime();
      const dateB = new Date(b.latestDate).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    // Apply filters
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      threadsArray = threadsArray.filter(t => 
        t.subject.toLowerCase().includes(query) ||
        t.participants.some(p => p.toLowerCase().includes(query)) ||
        t.institution?.toLowerCase().includes(query)
      );
    }
    
    if (filterIncidents) {
      threadsArray = threadsArray.filter(t => t.hasIncident);
    }
    
    if (filterUnprocessed) {
      threadsArray = threadsArray.filter(t => t.hasUnprocessed);
    }
    
    return threadsArray;
  }, [emails, sortOrder, searchQuery, filterIncidents, filterUnprocessed]);

  // Stats
  const stats = useMemo(() => ({
    totalEmails: emails.length,
    totalThreads: threads.length,
    incidents: emails.filter(e => e.incident_id || e.ai_analysis?.isIncident).length,
    unprocessed: emails.filter(e => !e.processed).length,
    avgConfidence: Math.round(
      emails.filter(e => e.ai_analysis?.confidence)
        .reduce((acc, e) => acc + (e.ai_analysis?.confidence || 0), 0) / 
      (emails.filter(e => e.ai_analysis?.confidence).length || 1)
    )
  }), [emails, threads]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .order('received_at', { ascending: false });

      if (error) throw error;
      setEmails((data || []) as unknown as Email[]);
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast.error('Erreur lors du chargement des emails');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();

    const channel = supabase
      .channel('emails-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emails' }, () => {
        fetchEmails();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch attachments when email is selected
  const fetchAttachments = async (emailId: string) => {
    setLoadingAttachments(true);
    try {
      const { data, error } = await supabase
        .from('email_attachments')
        .select('*')
        .eq('email_id', emailId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAttachments((data || []) as unknown as EmailAttachment[]);
    } catch (error) {
      console.error('Error fetching attachments:', error);
      setAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }
  };

  useEffect(() => {
    if (selectedEmail) {
      fetchAttachments(selectedEmail.id);
    } else {
      setAttachments([]);
    }
  }, [selectedEmail?.id]);

  const analyzeAttachment = async (attachmentId: string) => {
    setAnalyzingAttachment(attachmentId);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-attachment', {
        body: { attachmentId }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Pièce jointe analysée');
        if (selectedEmail) {
          fetchAttachments(selectedEmail.id);
        }
      }
    } catch (error) {
      console.error('Error analyzing attachment:', error);
      toast.error('Erreur lors de l\'analyse de la pièce jointe');
    } finally {
      setAnalyzingAttachment(null);
    }
  };

  const downloadAttachment = async (attachment: EmailAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('email-attachments')
        .download(attachment.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const getAttachmentIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const toggleThread = (threadId: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  };

  const analyzeThread = async (thread: EmailThread) => {
    setProcessingThread(thread.threadId);
    try {
      // Analyze all unprocessed emails in the thread
      const unprocessed = thread.emails.filter(e => !e.processed);
      
      for (const email of unprocessed) {
        await supabase.functions.invoke('auto-process-email', {
          body: { 
            emailId: email.id,
            autoCreate: autoProcessEnabled,
            confidenceThreshold: 70
          }
        });
      }
      
      // Run advanced thread analysis
      if (thread.emails.length > 1) {
        await supabase.functions.invoke('analyze-thread', {
          body: {
            threadId: thread.threadId,
            messages: thread.emails.map(e => ({
              date: e.received_at,
              sender: e.sender,
              subject: e.subject,
              body: e.body
            }))
          }
        });
      }
      
      toast.success(`Thread analysé (${thread.emails.length} emails)`);
      fetchEmails();
    } catch (error) {
      console.error('Error analyzing thread:', error);
      toast.error('Erreur lors de l\'analyse du thread');
    } finally {
      setProcessingThread(null);
    }
  };

  const analyzeAllThreads = async () => {
    const unprocessedThreads = threads.filter(t => t.hasUnprocessed);
    if (unprocessedThreads.length === 0) {
      toast.info('Tous les threads sont déjà analysés');
      return;
    }
    
    toast.info(`Analyse de ${unprocessedThreads.length} threads en cours...`);
    
    for (const thread of unprocessedThreads) {
      await analyzeThread(thread);
    }
    
    toast.success('Analyse globale terminée !');
  };

  const processEmailWithAI = async (email: Email) => {
    setProcessingEmail(email.id);
    try {
      const { data, error } = await supabase.functions.invoke('auto-process-email', {
        body: { 
          emailId: email.id,
          autoCreate: autoProcessEnabled,
          confidenceThreshold: 70
        }
      });

      if (error) throw error;

      if (data?.incidentCreated) {
        toast.success(`Incident #${data.incident?.numero} créé automatiquement !`);
      } else if (data?.analysis) {
        toast.success('Analyse terminée');
      }
      
      fetchEmails();
    } catch (error) {
      console.error('Error processing email:', error);
      toast.error('Erreur lors de l\'analyse');
    } finally {
      setProcessingEmail(null);
    }
  };

  const runAdvancedAnalysis = async (email: Email) => {
    setAdvancedAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-email-advanced', {
        body: { 
          emailId: email.id,
          threadId: email.gmail_thread_id,
          analyzeThread: !!email.gmail_thread_id
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Analyse approfondie terminée (${data.emailsAnalyzed} email(s))`);
        fetchEmails();
        if (selectedEmail?.id === email.id) {
          setSelectedEmail(prev => prev ? { ...prev, thread_analysis: data.analysis } : null);
        }
      }
    } catch (error: any) {
      console.error('Error in advanced analysis:', error);
      if (error.message?.includes('429')) {
        toast.error('Trop de requêtes, veuillez patienter');
      } else if (error.message?.includes('402')) {
        toast.error('Crédits IA épuisés');
      } else {
        toast.error('Erreur lors de l\'analyse approfondie');
      }
    } finally {
      setAdvancedAnalyzing(false);
    }
  };

  // Deep multi-perspective analysis
  const runDeepAnalysis = async (batchSize: number = 20) => {
    setDeepAnalyzing(true);
    setDeepAnalysisProgress({ analyzed: 0, total: emails.length, incidents: 0, newPatterns: 0, repeatedPatterns: 0 });
    
    toast.info(`Lancement de l'analyse approfondie multi-perspectives...`, {
      description: "5 perspectives d'analyse seront utilisées pour chaque email"
    });

    try {
      const totalBatches = Math.ceil(emails.length / batchSize);
      let totalIncidents = 0;
      let totalNewPatterns = 0;
      let totalRepeatedPatterns = 0;
      let totalAnalyzed = 0;

      for (let batch = 0; batch < totalBatches; batch++) {
        const { data, error } = await supabase.functions.invoke('deep-analyze-emails', {
          body: { 
            batchSize,
            minConfidence: 50
          }
        });

        if (error) {
          console.error('Deep analysis error:', error);
          continue;
        }

        if (data) {
          totalAnalyzed += data.analyzed || 0;
          totalIncidents += data.totalIncidents || 0;
          totalNewPatterns += data.newPatterns || 0;
          totalRepeatedPatterns += data.repeatedPatterns || 0;

          setDeepAnalysisProgress({
            analyzed: totalAnalyzed,
            total: emails.length,
            incidents: totalIncidents,
            newPatterns: totalNewPatterns,
            repeatedPatterns: totalRepeatedPatterns
          });

          // If no more emails to analyze, stop
          if ((data.analyzed || 0) === 0) break;
        }
      }

      toast.success(`Analyse approfondie terminée !`, {
        description: `${totalIncidents} incidents détectés • ${totalNewPatterns} nouveaux patterns • ${totalRepeatedPatterns} patterns répétés`
      });

      fetchEmails();
      
    } catch (error) {
      console.error('Deep analysis error:', error);
      toast.error('Erreur lors de l\'analyse approfondie');
    } finally {
      setDeepAnalyzing(false);
      setDeepAnalysisProgress(null);
    }
  };

  const generateAIResponse = async (email: Email) => {
    if (!email.ai_analysis) return;
    
    setGeneratingResponse(true);
    setShowResponseDialog(true);
    setAiResponse('');

    try {
      const response = await supabase.functions.invoke('analyze-incident', {
        body: {
          type: 'generate-response',
          emailSubject: email.subject,
          emailSender: email.sender,
          emailBody: email.body,
          analysis: email.ai_analysis
        }
      });

      if (response.error) throw response.error;
      setAiResponse(response.data.response || 'Impossible de générer une réponse.');
    } catch (error) {
      console.error('Error generating response:', error);
      toast.error('Erreur lors de la génération de la réponse');
      setAiResponse('Erreur lors de la génération. Veuillez réessayer.');
    } finally {
      setGeneratingResponse(false);
    }
  };

  const sendResponse = async () => {
    if (!selectedEmail || !aiResponse) return;

    setSendingResponse(true);
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: selectedEmail.sender,
          subject: `Re: ${selectedEmail.subject}`,
          html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
            <p>${aiResponse.replace(/\n/g, '<br/>')}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
            <p style="color: #666; font-size: 12px;">Ce message a été envoyé par le système de gestion des incidents.</p>
          </div>`,
          replyTo: alertEmail || undefined
        }
      });

      if (error) throw error;
      toast.success('Réponse envoyée avec succès !');
      setShowResponseDialog(false);
      setAiResponse('');
    } catch (error: any) {
      console.error('Error sending response:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi');
    } finally {
      setSendingResponse(false);
    }
  };

  const createIncidentFromEmail = async (email: Email) => {
    if (!email.ai_analysis) {
      toast.error('Pas d\'analyse IA disponible');
      return;
    }

    const analysis = email.ai_analysis;

    if (alertEmail && (analysis.suggestedGravity === 'Critique' || analysis.suggestedGravity === 'Grave')) {
      try {
        await supabase.functions.invoke('notify-critical', {
          body: {
            alertEmail,
            incidentTitle: analysis.suggestedTitle,
            incidentType: analysis.suggestedType,
            incidentGravite: analysis.suggestedGravity,
            incidentScore: analysis.confidence,
            incidentFaits: analysis.suggestedFacts,
            incidentInstitution: analysis.suggestedInstitution
          }
        });
        toast.success('Alerte critique envoyée !');
      } catch (error) {
        console.error('Error sending critical alert:', error);
      }
    }

    navigate('/nouveau', { 
      state: { 
        prefillData: {
          titre: analysis.suggestedTitle,
          faits: analysis.suggestedFacts,
          dysfonctionnement: analysis.suggestedDysfunction,
          institution: analysis.suggestedInstitution,
          type: analysis.suggestedType,
          gravite: analysis.suggestedGravity,
          emailSourceId: email.id
        }
      }
    });
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays < 7) {
      return d.toLocaleDateString('fr-FR', { weekday: 'short' });
    } else {
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    }
  };

  const formatFullDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'from-emerald-400 to-emerald-600';
    if (confidence >= 60) return 'from-amber-400 to-orange-500';
    return 'from-red-400 to-red-600';
  };

  const saveAlertEmail = () => {
    localStorage.setItem('alertEmail', alertEmail);
    setShowSettings(false);
    toast.success('Email d\'alerte enregistré');
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 min-h-screen">
        {/* Animated Background Orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="orb-bg orb-1" />
          <div className="orb-bg orb-2" />
        </div>

        <PageHeader 
          title="Boîte de réception" 
          description={`${stats.totalThreads} conversations • ${stats.totalEmails} emails`}
          icon={<Inbox className="h-7 w-7 text-white" />}
          actions={
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => setShowSettings(true)} variant="ghost" size="icon" className="glass-card">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Paramètres</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button onClick={fetchEmails} variant="ghost" disabled={loading} className="glass-card">
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Actualiser
              </Button>
              <Button 
                onClick={analyzeAllThreads} 
                className="glow-button text-white"
                disabled={processingThread !== null || deepAnalyzing}
              >
                <Brain className="h-4 w-4 mr-2" />
                Analyser
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => runDeepAnalysis(15)} 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                      disabled={deepAnalyzing || processingThread !== null}
                    >
                      {deepAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {deepAnalysisProgress ? `${deepAnalysisProgress.analyzed}/${deepAnalysisProgress.total}` : 'Analyse...'}
                        </>
                      ) : (
                        <>
                          <Layers className="h-4 w-4 mr-2" />
                          Analyse Multi-Passes
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold">Analyse Approfondie Multi-Perspectives</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      5 perspectives d'analyse : Collaboration, Consentement, Documents, Délais, Comportement.
                      Détecte les patterns récurrents et les nouveaux incidents.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          }
        />

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
                <Input
                  type="email"
                  placeholder="votre@email.com"
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  className="bg-secondary/50 mt-1"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Création automatique d'incidents</Label>
                  <p className="text-xs text-muted-foreground">Créer automatiquement les incidents (confiance &gt;70%)</p>
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
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Réponse générée par l'IA
              </DialogTitle>
              <DialogDescription>Vérifiez et modifiez la réponse avant envoi à {selectedEmail?.sender}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {generatingResponse ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-3">Génération en cours...</span>
                </div>
              ) : (
                <Textarea
                  value={aiResponse}
                  onChange={(e) => setAiResponse(e.target.value)}
                  className="min-h-[200px] bg-secondary/50"
                  placeholder="La réponse générée apparaîtra ici..."
                />
              )}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setShowResponseDialog(false)}>Annuler</Button>
              <Button onClick={sendResponse} disabled={generatingResponse || sendingResponse || !aiResponse}>
                {sendingResponse ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Envoyer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { icon: Layers, label: 'Threads', value: stats.totalThreads, color: 'from-blue-500 to-cyan-500' },
            { icon: Mail, label: 'Emails', value: stats.totalEmails, color: 'from-violet-500 to-purple-500' },
            { icon: AlertTriangle, label: 'Incidents', value: stats.incidents, color: 'from-rose-500 to-red-500' },
            { icon: Clock, label: 'Non traités', value: stats.unprocessed, color: 'from-amber-500 to-orange-500' },
            { icon: TrendingUp, label: 'Confiance moy.', value: `${stats.avgConfidence}%`, color: 'from-emerald-500 to-green-500' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="glass-card card-3d p-4 animate-scale-in group cursor-default"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2.5 rounded-xl bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110",
                  stat.color
                )}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="glass-card p-4 mb-6 animate-slide-up">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par sujet, expéditeur, institution..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <Button
                variant={filterIncidents ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterIncidents(!filterIncidents)}
                className={cn(filterIncidents && "glow-button text-white")}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Incidents
              </Button>
              <Button
                variant={filterUnprocessed ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterUnprocessed(!filterUnprocessed)}
                className={cn(filterUnprocessed && "glow-button text-white")}
              >
                <Clock className="h-4 w-4 mr-1" />
                Non traités
              </Button>
            </div>

            {/* Sort */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="glass-card"
            >
              {sortOrder === 'desc' ? (
                <SortDesc className="h-4 w-4 mr-1" />
              ) : (
                <SortAsc className="h-4 w-4 mr-1" />
              )}
              {sortOrder === 'desc' ? 'Récents' : 'Anciens'}
            </Button>

            {/* View Mode */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
              <Button
                variant={viewMode === 'threads' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('threads')}
                className={cn("h-8", viewMode === 'threads' && "shadow-glow-sm")}
              >
                <Layers className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={cn("h-8", viewMode === 'list' && "shadow-glow-sm")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Thread/Email List */}
          <div className="lg:col-span-2 space-y-3">
            {loading ? (
              <div className="glass-card p-8 text-center animate-pulse">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full bg-gradient-primary opacity-20 animate-ping" />
                  <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary">
                    <RefreshCw className="h-8 w-8 text-white animate-spin" />
                  </div>
                </div>
                <p className="text-muted-foreground">Chargement des emails...</p>
              </div>
            ) : threads.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-primary/10 flex items-center justify-center mx-auto mb-4 animate-float">
                  <Inbox className="h-10 w-10 text-primary" />
                </div>
                <p className="text-lg font-medium mb-2">Aucun email</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || filterIncidents || filterUnprocessed 
                    ? 'Aucun résultat pour ces filtres'
                    : 'Configurez Gmail pour synchroniser vos emails'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-380px)]">
                <div className="space-y-2 pr-4">
                  {threads.map((thread, index) => (
                    <Collapsible
                      key={thread.threadId}
                      open={expandedThreads.has(thread.threadId)}
                      onOpenChange={() => toggleThread(thread.threadId)}
                    >
                      <div
                        className={cn(
                          "glass-card overflow-hidden transition-all duration-300 animate-scale-in",
                          selectedThread?.threadId === thread.threadId && "ring-2 ring-primary shadow-glow",
                          thread.hasIncident && "border-l-4 border-l-rose-500"
                        )}
                        style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                      >
                        <CollapsibleTrigger asChild>
                          <div
                            className="p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedThread(thread);
                              if (thread.emails.length === 1) {
                                setSelectedEmail(thread.emails[0]);
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              {/* Thread Indicator */}
                              <div className={cn(
                                "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300",
                                thread.emails.length > 1 
                                  ? "bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg" 
                                  : "bg-secondary"
                              )}>
                                {thread.emails.length > 1 ? (
                                  <span className="text-white font-bold text-sm">{thread.emails.length}</span>
                                ) : (
                                  <Mail className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>

                              {/* Thread Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {thread.hasIncident && (
                                    <Badge className="bg-gradient-to-r from-rose-500 to-red-500 text-white text-xs animate-pulse">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Incident
                                    </Badge>
                                  )}
                                  {thread.hasUnprocessed && (
                                    <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Non traité
                                    </Badge>
                                  )}
                                  {thread.avgConfidence > 0 && (
                                    <span className={cn(
                                      "text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r text-white",
                                      getConfidenceColor(thread.avgConfidence)
                                    )}>
                                      {thread.avgConfidence}%
                                    </span>
                                  )}
                                </div>

                                <h4 className="font-semibold truncate text-sm">{thread.subject}</h4>
                                
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground truncate flex-1">
                                    {thread.participants.slice(0, 2).join(', ')}
                                    {thread.participants.length > 2 && ` +${thread.participants.length - 2}`}
                                  </p>
                                  <span className="text-xs text-muted-foreground flex-shrink-0">
                                    {formatDate(thread.latestDate)}
                                  </span>
                                </div>

                                {thread.institution && (
                                  <Badge variant="secondary" className="mt-2 text-xs">
                                    <Building2 className="h-3 w-3 mr-1" />
                                    {thread.institution}
                                  </Badge>
                                )}
                              </div>

                              {/* Expand Indicator */}
                              {thread.emails.length > 1 && (
                                <div className="flex-shrink-0">
                                  {expandedThreads.has(thread.threadId) ? (
                                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform" />
                                  ) : (
                                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform" />
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  analyzeThread(thread);
                                }}
                                disabled={processingThread === thread.threadId}
                                className="flex-1 h-8 text-xs"
                              >
                                {processingThread === thread.threadId ? (
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Brain className="h-3 w-3 mr-1" />
                                )}
                                Analyser
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedThread(thread);
                                  setSelectedEmail(thread.emails[0]);
                                }}
                                className="flex-1 h-8 text-xs"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Voir
                              </Button>
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        {/* Expanded Emails in Thread */}
                        <CollapsibleContent>
                          <div className="border-t border-border/50 bg-secondary/20">
                            {thread.emails.map((email, emailIndex) => (
                              <div
                                key={email.id}
                                onClick={() => {
                                  setSelectedThread(thread);
                                  setSelectedEmail(email);
                                }}
                                className={cn(
                                  "p-3 pl-16 cursor-pointer transition-all hover:bg-secondary/30 border-b border-border/30 last:border-b-0",
                                  selectedEmail?.id === email.id && "bg-primary/10"
                                )}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  {email.incident_id ? (
                                    <Badge className="bg-emerald-500/20 text-emerald-600 text-xs">
                                      <Check className="h-3 w-3 mr-1" />
                                      Incident créé
                                    </Badge>
                                  ) : email.ai_analysis?.isIncident ? (
                                    <Badge className="bg-rose-500/20 text-rose-600 text-xs">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Incident détecté
                                    </Badge>
                                  ) : email.processed ? (
                                    <Badge variant="secondary" className="text-xs">
                                      <Check className="h-3 w-3 mr-1" />
                                      Analysé
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">
                                      <Clock className="h-3 w-3 mr-1" />
                                      En attente
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm truncate">{email.sender}</p>
                                <p className="text-xs text-muted-foreground">{formatFullDate(email.received_at)}</p>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Email Detail & Analysis */}
          <div className="lg:col-span-3 space-y-4">
            {selectedEmail ? (
              <div className="space-y-4 animate-slide-up">
                {/* Email Content Card */}
                <div className="glass-card card-3d p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{selectedEmail.subject}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{selectedEmail.sender}</span>
                        <span>→</span>
                        <span>{selectedEmail.recipient || 'Moi'}</span>
                        <span className="text-xs">•</span>
                        <span className="text-xs">{formatFullDate(selectedEmail.received_at)}</span>
                      </div>
                    </div>
                    {selectedEmail.ai_analysis?.confidence && (
                      <div className={cn(
                        "px-4 py-2 rounded-xl bg-gradient-to-r text-white font-bold",
                        getConfidenceColor(selectedEmail.ai_analysis.confidence)
                      )}>
                        {selectedEmail.ai_analysis.confidence}%
                      </div>
                    )}
                  </div>

                  <ScrollArea className="h-48 rounded-xl bg-secondary/30 p-4">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedEmail.body}</p>
                  </ScrollArea>

                  {/* Attachments Section */}
                  {(attachments.length > 0 || loadingAttachments) && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Paperclip className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">
                          Pièces jointes ({attachments.length})
                        </span>
                      </div>
                      
                      {loadingAttachments ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Chargement...
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          {attachments.map((attachment) => {
                            const AttachmentIcon = getAttachmentIcon(attachment.mime_type);
                            const isAnalyzing = analyzingAttachment === attachment.id;
                            
                            return (
                              <div
                                key={attachment.id}
                                className="glass-card p-3 hover:shadow-glow transition-all"
                              >
                                <div className="flex items-start gap-3">
                                  <div className={cn(
                                    "p-2 rounded-lg",
                                    attachment.ai_analysis ? "bg-gradient-primary" : "bg-secondary"
                                  )}>
                                    <AttachmentIcon className={cn(
                                      "h-5 w-5",
                                      attachment.ai_analysis ? "text-white" : "text-muted-foreground"
                                    )} />
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{attachment.filename}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>{formatFileSize(attachment.size_bytes)}</span>
                                      {attachment.analyzed_at && (
                                        <>
                                          <span>•</span>
                                          <Badge variant="secondary" className="text-xs">
                                            <Check className="h-3 w-3 mr-1" />
                                            Analysé
                                          </Badge>
                                        </>
                                      )}
                                    </div>
                                    
                                    {/* AI Analysis Results */}
                                    {attachment.ai_analysis && (
                                      <div className="mt-2 p-2 rounded-lg bg-secondary/30 text-xs">
                                        <p className="font-medium mb-1">{attachment.ai_analysis.document_type}</p>
                                        <p className="text-muted-foreground line-clamp-2">
                                          {attachment.ai_analysis.summary}
                                        </p>
                                        {attachment.ai_analysis.problems_detected.length > 0 && (
                                          <div className="mt-2 flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                                            <span className="text-amber-600 dark:text-amber-400">
                                              {attachment.ai_analysis.problems_detected.length} problème(s) détecté(s)
                                            </span>
                                          </div>
                                        )}
                                        {attachment.ai_analysis.severity !== 'none' && (
                                          <Badge className={cn(
                                            "mt-2 text-xs",
                                            attachment.ai_analysis.severity === 'critical' && "bg-red-500 text-white",
                                            attachment.ai_analysis.severity === 'high' && "bg-orange-500 text-white",
                                            attachment.ai_analysis.severity === 'medium' && "bg-amber-500 text-white",
                                            attachment.ai_analysis.severity === 'low' && "bg-blue-500 text-white"
                                          )}>
                                            {attachment.ai_analysis.severity}
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex gap-1">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => downloadAttachment(attachment)}
                                          >
                                            <Download className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Télécharger</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    
                                    {!attachment.analyzed_at && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8"
                                              onClick={() => analyzeAttachment(attachment.id)}
                                              disabled={isAnalyzing}
                                            >
                                              {isAnalyzing ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                              ) : (
                                                <Brain className="h-4 w-4" />
                                              )}
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Analyser avec l'IA</TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/50">
                    {!selectedEmail.processed && (
                      <Button
                        onClick={() => processEmailWithAI(selectedEmail)}
                        disabled={processingEmail === selectedEmail.id}
                        className="glow-button text-white"
                      >
                        {processingEmail === selectedEmail.id ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Brain className="h-4 w-4 mr-2" />
                        )}
                        Analyser avec l'IA
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => runAdvancedAnalysis(selectedEmail)}
                      disabled={advancedAnalyzing}
                      className="glass-card"
                    >
                      {advancedAnalyzing ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Scale className="h-4 w-4 mr-2" />
                      )}
                      Analyse approfondie
                    </Button>
                    {selectedEmail.ai_analysis && (
                      <>
                        <Button variant="ghost" onClick={() => generateAIResponse(selectedEmail)} className="glass-card">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Répondre
                        </Button>
                        {!selectedEmail.incident_id && selectedEmail.ai_analysis.isIncident && (
                          <Button onClick={() => createIncidentFromEmail(selectedEmail)} className="glow-button text-white">
                            <Sparkles className="h-4 w-4 mr-2" />
                            Créer incident
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Analysis Results */}
                {selectedEmail.ai_analysis && (
                  <div className="glass-card p-6 animate-scale-in">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-xl bg-gradient-secondary shadow-glow-sm">
                        <Brain className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">Analyse IA</h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedEmail.ai_analysis.isIncident ? 'Incident potentiel détecté' : 'Aucun incident détecté'}
                        </p>
                      </div>
                    </div>

                    {selectedEmail.ai_analysis.isIncident ? (
                      <div className="grid gap-4">
                        <div className="p-4 rounded-xl bg-secondary/30">
                          <p className="text-xs text-muted-foreground mb-1">Titre suggéré</p>
                          <p className="font-semibold">{selectedEmail.ai_analysis.suggestedTitle}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-secondary/30">
                          <p className="text-xs text-muted-foreground mb-1">Résumé</p>
                          <p className="text-sm">{selectedEmail.ai_analysis.summary}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-secondary/30">
                            <p className="text-xs text-muted-foreground mb-1">Institution</p>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-primary" />
                              <span className="font-medium">{selectedEmail.ai_analysis.suggestedInstitution}</span>
                            </div>
                          </div>
                          <div className="p-4 rounded-xl bg-secondary/30">
                            <p className="text-xs text-muted-foreground mb-1">Gravité</p>
                            <Badge className={cn(
                              "text-white",
                              selectedEmail.ai_analysis.suggestedGravity === 'Critique' && "bg-gradient-to-r from-red-500 to-rose-500",
                              selectedEmail.ai_analysis.suggestedGravity === 'Grave' && "bg-gradient-to-r from-orange-500 to-amber-500",
                              selectedEmail.ai_analysis.suggestedGravity === 'Modéré' && "bg-gradient-to-r from-amber-400 to-yellow-500",
                              selectedEmail.ai_analysis.suggestedGravity === 'Mineur' && "bg-gradient-to-r from-emerald-400 to-emerald-600"
                            )}>
                              {selectedEmail.ai_analysis.suggestedGravity}
                            </Badge>
                          </div>
                        </div>

                        {selectedEmail.incident_id && (
                          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                            <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                            <p className="font-medium text-emerald-600 dark:text-emerald-400">Incident déjà créé</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Check className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                        <p className="text-muted-foreground">Cet email ne nécessite pas de suivi particulier</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Thread Analysis */}
                {selectedEmail.thread_analysis && (
                  <div className="glass-card p-6 animate-scale-in">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-glow-sm">
                        <Scale className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">Analyse approfondie</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress 
                            value={selectedEmail.thread_analysis.problem_score} 
                            className="h-2 flex-1"
                          />
                          <span className={cn(
                            "text-sm font-bold",
                            selectedEmail.thread_analysis.problem_score >= 70 ? "text-rose-500" :
                            selectedEmail.thread_analysis.problem_score >= 40 ? "text-amber-500" : "text-emerald-500"
                          )}>
                            {selectedEmail.thread_analysis.problem_score}/100
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {selectedEmail.thread_analysis.deadline_violations.detected && (
                        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                          <p className="font-medium text-rose-600 dark:text-rose-400 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Violations de délais
                          </p>
                          <ul className="mt-2 space-y-1">
                            {selectedEmail.thread_analysis.deadline_violations.details.slice(0, 3).map((d, i) => (
                              <li key={i} className="text-sm text-muted-foreground">• {d}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedEmail.thread_analysis.unanswered_questions.detected && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <p className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Questions sans réponse
                          </p>
                          <ul className="mt-2 space-y-1">
                            {selectedEmail.thread_analysis.unanswered_questions.questions.slice(0, 3).map((q, i) => (
                              <li key={i} className="text-sm text-muted-foreground">• {q}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedEmail.thread_analysis.contradictions.detected && (
                        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                          <p className="font-medium text-purple-600 dark:text-purple-400 flex items-center gap-2">
                            <X className="h-4 w-4" />
                            Contradictions détectées
                          </p>
                        </div>
                      )}
                      {selectedEmail.thread_analysis.rule_violations.detected && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                          <p className="font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Violations de règles
                          </p>
                        </div>
                      )}
                    </div>

                    {selectedEmail.thread_analysis.recommendations.length > 0 && (
                      <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <p className="font-medium mb-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Recommandations
                        </p>
                        <ul className="space-y-2">
                          {selectedEmail.thread_analysis.recommendations.slice(0, 3).map((rec, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <ArrowRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card p-12 text-center animate-scale-in">
                <div className="w-24 h-24 rounded-3xl bg-gradient-primary/10 flex items-center justify-center mx-auto mb-6 animate-float">
                  <Mail className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Sélectionnez un thread</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Cliquez sur un thread dans la liste pour voir les détails et l'analyse IA
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
