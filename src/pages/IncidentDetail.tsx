import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Pencil, 
  FileText, 
  Send, 
  Calendar, 
  Building, 
  Tag,
  AlertTriangle,
  ExternalLink,
  FileIcon,
  Mail,
  Image,
  Link as LinkIcon,
  Loader2,
  Volume2,
  MessageSquare,
  Download,
  Settings2,
  Paperclip,
  RefreshCw,
  Eye,
  FileWarning
} from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { PriorityBadge, StatusBadge } from '@/components/common';
import { useIncidentStore } from '@/stores/incidentStore';
import { formatDate, formatDateTime } from '@/config/appConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { EmailLink } from '@/components/email';
import { supabase } from '@/integrations/supabase/client';
import { EmailViewer } from '@/components/email';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { generateIncidentPDF } from '@/utils/generateIncidentPDF';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

const proofIcons = {
  email: Mail,
  screenshot: Image,
  document: FileIcon,
  link: LinkIcon
};

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { incidents, updateIncident, loadFromSupabase, isLoading } = useIncidentStore();
  const [hasLoaded, setHasLoaded] = useState(false);
  const [sourceEmailId, setSourceEmailId] = useState<string | null>(null);
  const [relatedEmails, setRelatedEmails] = useState<any[]>([]);
  const [showEmailViewer, setShowEmailViewer] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [syncingAttachments, setSyncingAttachments] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<any>(null);
  const [exportOptions, setExportOptions] = useState({
    includeProofs: true,
    includeLegalExplanations: true,
    includeEmails: true,
    includeEmailCitations: true,
    includeLegalSearch: false,
    includeDeepAnalysis: false,
  });
  
  useEffect(() => {
    const load = async () => {
      await loadFromSupabase();
      setHasLoaded(true);
    };
    load();
  }, [loadFromSupabase]);

  // Fetch source email, related emails, and attachments
  useEffect(() => {
    const fetchRelatedData = async () => {
      if (!id) return;
      
      const { data: incidentData } = await supabase
        .from('incidents')
        .select('email_source_id, gmail_references')
        .eq('id', id)
        .single();
      
      if (incidentData?.email_source_id) {
        setSourceEmailId(incidentData.email_source_id);
        
        // Fetch source email to get thread
        const { data: sourceEmail } = await supabase
          .from('emails')
          .select('*')
          .eq('id', incidentData.email_source_id)
          .single();
        
        if (sourceEmail?.gmail_thread_id) {
          const { data: threadEmails } = await supabase
            .from('emails')
            .select('*')
            .eq('gmail_thread_id', sourceEmail.gmail_thread_id)
            .order('received_at', { ascending: true });
          
          setRelatedEmails(threadEmails || []);
          
          // Fetch attachments for all thread emails
          if (threadEmails && threadEmails.length > 0) {
            setLoadingAttachments(true);
            const emailIds = threadEmails.map(e => e.id);
            const { data: attachmentsData } = await supabase
              .from('email_attachments')
              .select('*, emails!inner(sender, subject, received_at)')
              .in('email_id', emailIds)
              .order('created_at', { ascending: false });
            
            setAttachments(attachmentsData || []);
            setLoadingAttachments(false);
          }
        } else {
          setRelatedEmails(sourceEmail ? [sourceEmail] : []);
          
          // Fetch attachments for single email
          if (sourceEmail) {
            setLoadingAttachments(true);
            const { data: attachmentsData } = await supabase
              .from('email_attachments')
              .select('*, emails!inner(sender, subject, received_at)')
              .eq('email_id', sourceEmail.id)
              .order('created_at', { ascending: false });
            
            setAttachments(attachmentsData || []);
            setLoadingAttachments(false);
          }
        }
      }
    };
    
    fetchRelatedData();
  }, [id]);
  
  const incident = incidents.find(i => i.id === id);

  if (isLoading || !hasLoaded) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!incident) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-2">Incident non trouvé</h2>
            <p className="text-sm text-muted-foreground mb-4">ID: {id}</p>
            <Button variant="outline" asChild>
              <Link to="/incidents">Retour à la liste</Link>
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const speakText = (text: string) => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const speakIncident = () => {
    const text = `
      Incident numéro ${incident.numero}. ${incident.titre}.
      Date: ${formatDate(incident.dateIncident)}.
      Institution: ${incident.institution}.
      Type: ${incident.type}.
      Gravité: ${incident.gravite}.
      Faits constatés: ${incident.faits}.
      Dysfonctionnement: ${incident.dysfonctionnement}.
    `;
    speakText(text);
  };

  // Sync attachments from Gmail
  const syncAttachments = async () => {
    if (!sourceEmailId) {
      toast.error("Pas d'email source lié à cet incident");
      return;
    }

    setSyncingAttachments(true);
    try {
      // Get email with gmail_message_id
      const { data: email } = await supabase
        .from('emails')
        .select('gmail_message_id, gmail_thread_id')
        .eq('id', sourceEmailId)
        .single();

      if (!email?.gmail_message_id) {
        toast.error("Pas d'identifiant Gmail pour cet email");
        return;
      }

      // Download attachments
      const { data: downloadResult, error: downloadError } = await supabase.functions.invoke('download-attachments', {
        body: { emailId: sourceEmailId, messageId: email.gmail_message_id }
      });

      if (downloadError) throw downloadError;

      // Analyze downloaded attachments
      if (downloadResult?.attachments?.length > 0) {
        for (const att of downloadResult.attachments) {
          await supabase.functions.invoke('analyze-attachment', {
            body: { attachmentId: att.id }
          });
        }
      }

      // Refresh attachments list
      const emailIds = relatedEmails.map(e => e.id);
      const { data: refreshedAttachments } = await supabase
        .from('email_attachments')
        .select('*, emails!inner(sender, subject, received_at)')
        .in('email_id', emailIds.length > 0 ? emailIds : [sourceEmailId])
        .order('created_at', { ascending: false });

      setAttachments(refreshedAttachments || []);

      // Update incident preuves
      if (refreshedAttachments && refreshedAttachments.length > 0) {
        const preuves = refreshedAttachments.map(att => ({
          id: att.id,
          type: 'document' as const,
          label: att.filename,
          url: `storage://email-attachments/${att.storage_path}`,
          source: 'email_attachment',
          mime_type: att.mime_type,
        }));

        await supabase
          .from('incidents')
          .update({ preuves })
          .eq('id', id);

        // Refresh incident in store
        await loadFromSupabase();
      }

      toast.success(`${downloadResult?.downloaded || 0} pièces jointes synchronisées et analysées`);
    } catch (error) {
      console.error('Sync attachments error:', error);
      toast.error("Erreur lors de la synchronisation des pièces jointes");
    } finally {
      setSyncingAttachments(false);
    }
  };

  // Download attachment from storage
  const downloadAttachment = async (storagePath: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('email-attachments')
        .download(storagePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Erreur lors du téléchargement");
    }
  };

  // Get severity from AI analysis
  const getAttachmentSeverity = (aiAnalysis: any): { level: string; color: string } => {
    if (!aiAnalysis) return { level: 'Non analysé', color: 'secondary' };
    
    const severity = aiAnalysis.severity || aiAnalysis.legal_analysis?.severity;
    if (severity === 'critique' || severity === 'critical') return { level: 'Critique', color: 'destructive' };
    if (severity === 'grave' || severity === 'high') return { level: 'Grave', color: 'destructive' };
    if (severity === 'modéré' || severity === 'medium') return { level: 'Modéré', color: 'warning' };
    if (severity === 'mineur' || severity === 'low') return { level: 'Mineur', color: 'secondary' };
    if (aiAnalysis.violations_detected?.length > 0) return { level: 'Violations', color: 'destructive' };
    return { level: 'Analysé', color: 'default' };
  };

  const markTransmisJP = () => {
    updateIncident(incident.id, { 
      transmisJP: true, 
      dateTransmissionJP: new Date().toISOString(),
      statut: 'Transmis'
    });
  };

  const exportPDF = async (withOptions = false) => {
    setExportingPDF(true);
    setShowExportDialog(false);
    try {
      const opts = withOptions ? {
        ...exportOptions,
        emails: exportOptions.includeEmails || exportOptions.includeEmailCitations ? relatedEmails : [],
      } : {
        includeProofs: true,
        includeLegalExplanations: true,
      };

      await generateIncidentPDF({
        id: incident.id,
        numero: incident.numero,
        titre: incident.titre,
        dateIncident: incident.dateIncident,
        dateCreation: incident.dateCreation,
        institution: incident.institution,
        type: incident.type,
        gravite: incident.gravite,
        priorite: incident.priorite,
        score: incident.score,
        statut: incident.statut,
        faits: incident.faits,
        dysfonctionnement: incident.dysfonctionnement,
        transmisJP: incident.transmisJP,
        dateTransmissionJP: incident.dateTransmissionJP,
        preuves: incident.preuves.map(p => ({
          id: p.id,
          type: p.type,
          label: p.label,
          url: p.url,
        })),
      }, opts);
      
      const features: string[] = [];
      if (withOptions && exportOptions.includeEmails) features.push('emails');
      if (withOptions && exportOptions.includeLegalSearch) features.push('recherche juridique');
      
      toast.success(`PDF généré${features.length > 0 ? ` avec ${features.join(', ')}` : ''}`);
    } catch (error) {
      console.error('Erreur export PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6">
        <div className="mb-4 md:mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-xl md:text-2xl font-semibold">
              Incident #{incident.numero}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              {incident.titre}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={speaking ? "destructive" : "outline"} 
              size="sm" 
              onClick={speakIncident}
            >
              <Volume2 className="h-4 w-4 mr-2" />
              {speaking ? 'Stop' : 'Écouter'}
            </Button>
            {sourceEmailId && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedEmailId(sourceEmailId);
                  setShowEmailViewer(true);
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email source
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to={`/incidents/${incident.id}/edit`}>
                <Pencil className="h-4 w-4 mr-2" />
                Modifier
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportPDF(false)}
              disabled={exportingPDF}
            >
              {exportingPDF ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              PDF
            </Button>
            <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={exportingPDF}>
                  <Settings2 className="h-4 w-4 mr-2" />
                  PDF+
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Options d'export PDF enrichi</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="proofs" 
                      checked={exportOptions.includeProofs}
                      onCheckedChange={(c) => setExportOptions(o => ({...o, includeProofs: !!c}))}
                    />
                    <Label htmlFor="proofs">Inclure les preuves</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="legal" 
                      checked={exportOptions.includeLegalExplanations}
                      onCheckedChange={(c) => setExportOptions(o => ({...o, includeLegalExplanations: !!c}))}
                    />
                    <Label htmlFor="legal">Inclure les bases légales</Label>
                  </div>
                  <Separator />
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="emails" 
                      checked={exportOptions.includeEmails}
                      onCheckedChange={(c) => setExportOptions(o => ({...o, includeEmails: !!c}))}
                      disabled={relatedEmails.length === 0}
                    />
                    <Label htmlFor="emails">Inclure tous les emails ({relatedEmails.length})</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="citations" 
                      checked={exportOptions.includeEmailCitations}
                      onCheckedChange={(c) => setExportOptions(o => ({...o, includeEmailCitations: !!c}))}
                      disabled={relatedEmails.length === 0}
                    />
                    <div>
                      <Label htmlFor="citations">Extraire les citations probantes</Label>
                      <p className="text-xs text-muted-foreground">
                        Passages surlignés automatiquement: violations, délais, engagements, menaces
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="deep" 
                      checked={exportOptions.includeDeepAnalysis}
                      onCheckedChange={(c) => setExportOptions(o => ({...o, includeDeepAnalysis: !!c}))}
                      disabled={relatedEmails.length === 0}
                    />
                    <div>
                      <Label htmlFor="deep">🧠 Analyse approfondie IA</Label>
                      <p className="text-xs text-muted-foreground">
                        Chaîne causale, excuses vs obligations légales, contradictions, délais critiques, responsabilités
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="search" 
                      checked={exportOptions.includeLegalSearch}
                      onCheckedChange={(c) => setExportOptions(o => ({...o, includeLegalSearch: !!c}))}
                    />
                    <Label htmlFor="search">Recherche juridique en ligne</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    La recherche juridique interroge automatiquement bger.ch et Fedlex pour trouver jurisprudence et législation pertinentes.
                  </p>
                </div>
                <Button onClick={() => exportPDF(true)} disabled={exportingPDF} className="w-full">
                  {exportingPDF ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Générer le PDF enrichi
                </Button>
              </DialogContent>
            </Dialog>
            {!incident.transmisJP && (
              <Button size="sm" onClick={markTransmisJP}>
                <Send className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Transmettre JP</span>
                <span className="sm:hidden">JP</span>
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards - Responsive grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 md:gap-3">
                <Calendar className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium text-sm md:text-base truncate">{formatDate(incident.dateIncident)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 md:gap-3">
                <Building className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Institution</p>
                  <p className="font-medium text-sm md:text-base truncate">{incident.institution}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 md:gap-3">
                <Tag className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="font-medium text-sm md:text-base truncate">{incident.type}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 md:gap-3">
                <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Gravité</p>
                  <p className="font-medium text-sm md:text-base truncate">{incident.gravite}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status & Priority */}
        <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-6">
          <StatusBadge status={incident.statut} />
          <PriorityBadge 
            priority={incident.priorite} 
            score={incident.score}
            gravite={incident.gravite}
            type={incident.type}
          />
          {incident.transmisJP && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
              <Send className="h-3 w-3" />
              Transmis JP {incident.dateTransmissionJP && `le ${formatDate(incident.dateTransmissionJP)}`}
            </span>
          )}
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="resume" className="space-y-4">
          <TabsList className="w-full md:w-auto flex-wrap">
            <TabsTrigger value="resume" className="flex-1 md:flex-none">Résumé</TabsTrigger>
            <TabsTrigger value="preuves" className="flex-1 md:flex-none">
              Preuves ({incident.preuves.length})
            </TabsTrigger>
            <TabsTrigger value="attachments" className="flex-1 md:flex-none">
              <Paperclip className="h-4 w-4 mr-1" />
              Pièces jointes ({attachments.length})
            </TabsTrigger>
            {relatedEmails.length > 0 && (
              <TabsTrigger value="emails" className="flex-1 md:flex-none">
                <MessageSquare className="h-4 w-4 mr-1" />
                Emails ({relatedEmails.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="resume">
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Faits constatés</h3>
                  <p className="text-sm md:text-base text-muted-foreground whitespace-pre-wrap">
                    {incident.faits || 'Non renseigné'}
                  </p>
                </div>
                <Separator />
                <div>
                  <h3 className="font-medium mb-2">Dysfonctionnement</h3>
                  <p className="text-sm md:text-base text-muted-foreground whitespace-pre-wrap">
                    {incident.dysfonctionnement || 'Non renseigné'}
                  </p>
                </div>
                <Separator />
                <div className="text-xs text-muted-foreground">
                  Créé le {formatDateTime(incident.dateCreation)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preuves">
            <Card>
              <CardContent className="pt-6">
                {incident.preuves.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune preuve attachée
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incident.preuves.map((preuve) => {
                      const Icon = proofIcons[preuve.type] || FileIcon;
                      return (
                        <div 
                          key={preuve.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
                        >
                          <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{preuve.label}</p>
                            <p className="text-xs text-muted-foreground capitalize">{preuve.type}</p>
                          </div>
                          {preuve.type === 'email' && preuve.url && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedEmailId(preuve.url);
                                setShowEmailViewer(true);
                              }}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                          {preuve.url && preuve.type !== 'email' && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={preuve.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attachments Tab */}
          <TabsContent value="attachments">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Paperclip className="h-5 w-5" />
                    Pièces jointes des emails
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={syncAttachments}
                    disabled={syncingAttachments || !sourceEmailId}
                  >
                    {syncingAttachments ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Synchroniser
                  </Button>
                </div>

                {loadingAttachments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : attachments.length === 0 ? (
                  <div className="text-center py-8">
                    <Paperclip className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucune pièce jointe trouvée</p>
                    {sourceEmailId && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-4"
                        onClick={syncAttachments}
                        disabled={syncingAttachments}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Récupérer les pièces jointes depuis Gmail
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {attachments.map((att) => {
                      const severity = getAttachmentSeverity(att.ai_analysis);
                      const isImage = att.mime_type?.startsWith('image/');
                      const isPdf = att.mime_type === 'application/pdf';
                      
                      return (
                        <div 
                          key={att.id}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50 hover:bg-muted/80 transition-colors"
                        >
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                            {isImage ? (
                              <Image className="h-5 w-5 text-muted-foreground" />
                            ) : isPdf ? (
                              <FileText className="h-5 w-5 text-red-500" />
                            ) : (
                              <FileIcon className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{att.filename}</p>
                            <p className="text-xs text-muted-foreground">
                              {att.emails?.sender && `De: ${att.emails.sender.split('<')[0].trim()}`}
                              {att.emails?.received_at && ` • ${format(new Date(att.emails.received_at), 'd MMM yyyy', { locale: fr })}`}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge 
                                variant={severity.color === 'destructive' ? 'destructive' : severity.color === 'warning' ? 'secondary' : 'outline'}
                                className="text-xs"
                              >
                                {att.ai_analysis ? severity.level : 'Non analysé'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {(att.size_bytes / 1024).toFixed(1)} Ko
                              </span>
                            </div>
                            {att.ai_analysis?.violations_detected?.length > 0 && (
                              <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/20">
                                <div className="flex items-center gap-1 text-xs font-medium text-destructive">
                                  <FileWarning className="h-3 w-3" />
                                  {att.ai_analysis.violations_detected.length} violation(s) détectée(s)
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {att.ai_analysis && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => setSelectedAttachment(att)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh]">
                                  <DialogHeader>
                                    <DialogTitle>Analyse IA: {att.filename}</DialogTitle>
                                  </DialogHeader>
                                  <ScrollArea className="max-h-[60vh]">
                                    <div className="space-y-4 p-4">
                                      {att.ai_analysis?.extracted_text && (
                                        <div>
                                          <h4 className="font-medium mb-2">Texte extrait (OCR)</h4>
                                          <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded-lg max-h-40 overflow-y-auto">
                                            {att.ai_analysis.extracted_text.substring(0, 2000)}
                                            {att.ai_analysis.extracted_text.length > 2000 && '...'}
                                          </p>
                                        </div>
                                      )}
                                      {att.ai_analysis?.legal_analysis && (
                                        <div>
                                          <h4 className="font-medium mb-2">Analyse juridique</h4>
                                          <div className="text-sm space-y-2">
                                            {att.ai_analysis.legal_analysis.summary && (
                                              <p>{att.ai_analysis.legal_analysis.summary}</p>
                                            )}
                                            {att.ai_analysis.legal_analysis.key_dates?.length > 0 && (
                                              <div>
                                                <span className="font-medium">Dates clés: </span>
                                                {att.ai_analysis.legal_analysis.key_dates.join(', ')}
                                              </div>
                                            )}
                                            {att.ai_analysis.legal_analysis.mentioned_articles?.length > 0 && (
                                              <div>
                                                <span className="font-medium">Articles mentionnés: </span>
                                                {att.ai_analysis.legal_analysis.mentioned_articles.join(', ')}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      {att.ai_analysis?.violations_detected?.length > 0 && (
                                        <div>
                                          <h4 className="font-medium mb-2 text-destructive">Violations détectées</h4>
                                          <ul className="list-disc list-inside text-sm space-y-1">
                                            {att.ai_analysis.violations_detected.map((v: any, i: number) => (
                                              <li key={i} className="text-destructive">{typeof v === 'string' ? v : v.description || v.type}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  </ScrollArea>
                                </DialogContent>
                              </Dialog>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => downloadAttachment(att.storage_path, att.filename)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {relatedEmails.length > 0 && (
            <TabsContent value="emails">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Historique de la discussion
                    </h3>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const text = relatedEmails.map(e => 
                          `De: ${e.sender}. Date: ${format(new Date(e.received_at), 'd MMMM yyyy', { locale: fr })}. ${e.body}`
                        ).join('\n\nEmail suivant:\n\n');
                        
                        if (speaking) {
                          window.speechSynthesis.cancel();
                          setSpeaking(false);
                        } else {
                          speakText(`Discussion complète. ${relatedEmails.length} emails. ${text}`);
                        }
                      }}
                    >
                      <Volume2 className="h-4 w-4 mr-2" />
                      {speaking ? 'Stop' : 'Tout écouter'}
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {relatedEmails.map((email, index) => (
                      <Card 
                        key={email.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          setSelectedEmailId(email.id);
                          setShowEmailViewer(true);
                        }}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{email.sender}</span>
                                {email.is_sent && (
                                  <Badge variant="outline" className="text-xs">Envoyé</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(email.received_at), "d MMMM yyyy à HH:mm", { locale: fr })}
                              </p>
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {email.body}
                              </p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                speakText(`De: ${email.sender}. ${email.body}`);
                              }}
                            >
                              <Volume2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Email Viewer Dialog */}
        <EmailViewer 
          emailId={selectedEmailId} 
          open={showEmailViewer} 
          onOpenChange={setShowEmailViewer} 
        />
      </div>
    </AppLayout>
  );
}
