import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { 
  Paperclip, 
  FileText, 
  Image, 
  FileSpreadsheet,
  Download, 
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Play,
  FileQuestion,
  Scale,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AttachmentAnalysis {
  document_type?: string;
  is_official?: boolean;
  is_registered_mail?: boolean;
  key_elements?: string[];
  institutions_mentioned?: string[];
  persons_mentioned?: string[];
  dates_found?: string[];
  amounts_found?: string[];
  signatures_present?: boolean;
  pupille_involved?: boolean | null;
  pupille_signature_present?: boolean | null;
  problems_detected?: string[];
  consent_issues?: boolean;
  unauthorized_disclosure?: boolean;
  legal_violations?: string[];
  legal_implications?: string;
  summary?: string;
  severity?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  confidence?: number;
  recommended_actions?: string[];
}

interface Attachment {
  id: string;
  email_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  gmail_attachment_id: string | null;
  ai_analysis: AttachmentAnalysis | null;
  extracted_text: string | null;
  analyzed_at: string | null;
  created_at: string;
  emails?: {
    id: string;
    subject: string;
    sender: string;
    received_at: string;
  };
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
  if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
  return FileQuestion;
};

const getSeverityColor = (severity?: string) => {
  switch (severity) {
    case 'critical': return 'bg-red-500/20 text-red-500 border-red-500/30';
    case 'high': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
    case 'medium': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    case 'low': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
    default: return 'bg-green-500/20 text-green-500 border-green-500/30';
  }
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function Attachments() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch all attachments with email info
  const { data: attachments, isLoading, refetch } = useQuery({
    queryKey: ['attachments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_attachments')
        .select(`
          *,
          emails (
            id,
            subject,
            sender,
            received_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Attachment[];
    }
  });

  // Download all attachments from Gmail
  const downloadAllAttachments = async () => {
    setDownloading(true);
    setDownloadProgress(0);

    try {
      // Get emails with Gmail message IDs that might have attachments
      const { data: emails, error: emailsError } = await supabase
        .from('emails')
        .select('id, gmail_message_id, subject')
        .not('gmail_message_id', 'is', null);

      if (emailsError) throw emailsError;

      let processed = 0;
      let totalDownloaded = 0;

      for (const email of emails || []) {
        try {
          const response = await supabase.functions.invoke('download-attachments', {
            body: { emailId: email.id, messageId: email.gmail_message_id }
          });

          if (response.data?.downloaded) {
            totalDownloaded += response.data.downloaded;
          }
        } catch (error) {
          console.error(`Error downloading attachments for email ${email.id}:`, error);
        }

        processed++;
        setDownloadProgress(Math.round((processed / emails.length) * 100));
      }

      toast.success(`${totalDownloaded} pièces jointes téléchargées`);
      refetch();
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setDownloading(false);
    }
  };

  // Analyze all unanalyzed attachments
  const analyzeAllAttachments = async () => {
    setAnalyzing(true);
    setAnalysisProgress(0);

    try {
      const unanalyzed = attachments?.filter(a => !a.analyzed_at) || [];
      
      if (unanalyzed.length === 0) {
        toast.info('Toutes les pièces jointes sont déjà analysées');
        setAnalyzing(false);
        return;
      }

      let processed = 0;
      let successCount = 0;

      for (const attachment of unanalyzed) {
        try {
          const response = await supabase.functions.invoke('analyze-attachment', {
            body: { attachmentId: attachment.id }
          });

          if (response.data?.success) {
            successCount++;
          }
        } catch (error) {
          console.error(`Error analyzing attachment ${attachment.id}:`, error);
        }

        processed++;
        setAnalysisProgress(Math.round((processed / unanalyzed.length) * 100));
      }

      toast.success(`${successCount}/${unanalyzed.length} pièces jointes analysées`);
      refetch();
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Erreur lors de l\'analyse');
    } finally {
      setAnalyzing(false);
    }
  };

  // Analyze single attachment
  const analyzeSingleAttachment = async (attachmentId: string) => {
    try {
      toast.info('Analyse en cours...');
      const response = await supabase.functions.invoke('analyze-attachment', {
        body: { attachmentId }
      });

      if (response.data?.success) {
        toast.success('Analyse terminée');
        refetch();
      } else {
        toast.error('Erreur lors de l\'analyse');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Erreur lors de l\'analyse');
    }
  };

  // Preview attachment
  const previewAttachment = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('email-attachments')
        .createSignedUrl(attachment.storage_path, 3600);

      if (error) throw error;
      
      if (attachment.mime_type.startsWith('image/') || attachment.mime_type === 'application/pdf') {
        setPreviewUrl(data.signedUrl);
        setSelectedAttachment(attachment);
      } else {
        // Download file directly
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Erreur lors de la prévisualisation');
    }
  };

  // Filter attachments
  const filteredAttachments = attachments?.filter(a => 
    a.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.emails?.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.emails?.sender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.ai_analysis as AttachmentAnalysis)?.document_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const stats = {
    total: attachments?.length || 0,
    analyzed: attachments?.filter(a => a.analyzed_at)?.length || 0,
    withProblems: attachments?.filter(a => {
      const analysis = a.ai_analysis as AttachmentAnalysis;
      return analysis?.severity && analysis.severity !== 'none';
    })?.length || 0,
    critical: attachments?.filter(a => {
      const analysis = a.ai_analysis as AttachmentAnalysis;
      return analysis?.severity === 'critical' || analysis?.severity === 'high';
    })?.length || 0,
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
              <Paperclip className="h-8 w-8" />
              Pièces Jointes
            </h1>
            <p className="text-muted-foreground mt-1">
              Téléchargement et analyse des pièces jointes des emails
            </p>
          </div>

          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={downloadAllAttachments}
                  disabled={downloading}
                  className="glass-card"
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Télécharger
                </Button>
              </TooltipTrigger>
              <TooltipContent>Télécharger les pièces jointes depuis Gmail</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={analyzeAllAttachments}
                  disabled={analyzing}
                  className="bg-gradient-primary text-white"
                >
                  {analyzing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Analyser tout
                </Button>
              </TooltipTrigger>
              <TooltipContent>Analyser toutes les pièces jointes non analysées</TooltipContent>
            </Tooltip>

            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress bars */}
        {downloading && (
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <Download className="h-5 w-5 text-primary animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2">Téléchargement en cours...</p>
                  <Progress value={downloadProgress} className="h-2" />
                </div>
                <span className="text-sm text-muted-foreground">{downloadProgress}%</span>
              </div>
            </CardContent>
          </Card>
        )}

        {analyzing && (
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2">Analyse en cours...</p>
                  <Progress value={analysisProgress} className="h-2" />
                </div>
                <span className="text-sm text-muted-foreground">{analysisProgress}%</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Paperclip className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.analyzed}</p>
                  <p className="text-xs text-muted-foreground">Analysées</p>
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
                  <p className="text-2xl font-bold">{stats.withProblems}</p>
                  <p className="text-xs text-muted-foreground">Avec problèmes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <Scale className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.critical}</p>
                  <p className="text-xs text-muted-foreground">Critiques</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email, type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 glass-card"
          />
        </div>

        {/* Attachments list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredAttachments?.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Paperclip className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'Aucune pièce jointe trouvée' : 'Aucune pièce jointe. Cliquez sur "Télécharger" pour récupérer les pièces jointes depuis Gmail.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredAttachments?.map((attachment) => {
              const FileIcon = getFileIcon(attachment.mime_type);
              const analysis = attachment.ai_analysis as AttachmentAnalysis;
              
              return (
                <Card key={attachment.id} className="glass-card hover:shadow-glow-sm transition-all duration-300">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      {/* File icon */}
                      <div className="p-3 rounded-xl bg-primary/20 flex-shrink-0">
                        <FileIcon className="h-6 w-6 text-primary" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium truncate">{attachment.filename}</h3>
                            <p className="text-sm text-muted-foreground">
                              {attachment.emails?.subject || 'Email inconnu'} • {attachment.emails?.sender}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{formatBytes(attachment.size_bytes)}</span>
                              <span>•</span>
                              <span>{attachment.mime_type}</span>
                              <span>•</span>
                              <span>{format(new Date(attachment.created_at), 'dd MMM yyyy', { locale: fr })}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {attachment.analyzed_at ? (
                              <Badge className={getSeverityColor(analysis?.severity)}>
                                {analysis?.severity === 'none' ? 'OK' : analysis?.severity?.toUpperCase() || 'ANALYSÉ'}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                Non analysé
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Analysis summary */}
                        {analysis?.summary && (
                          <div className="mt-3 p-3 rounded-lg bg-muted/50">
                            <p className="text-sm">{analysis.summary}</p>
                            
                            {analysis.problems_detected && analysis.problems_detected.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {analysis.problems_detected.map((problem, i) => (
                                  <Badge key={i} variant="outline" className="text-xs bg-red-500/10 text-red-500 border-red-500/30">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    {problem}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {analysis.legal_violations && analysis.legal_violations.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {analysis.legal_violations.map((violation, i) => {
                                  // Handle both string and object formats
                                  const displayText = typeof violation === 'string' 
                                    ? violation 
                                    : (violation as any)?.issue || (violation as any)?.legal_article || 'Violation';
                                  return (
                                    <Badge key={i} variant="outline" className="text-xs bg-orange-500/10 text-orange-500 border-orange-500/30">
                                      <Scale className="h-3 w-3 mr-1" />
                                      {displayText}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => previewAttachment(attachment)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Voir
                          </Button>

                          {!attachment.analyzed_at && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => analyzeSingleAttachment(attachment.id)}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Analyser
                            </Button>
                          )}

                          {attachment.analyzed_at && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedAttachment(attachment)}
                            >
                              Détails
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Preview/Details Dialog */}
        <Dialog open={!!selectedAttachment} onOpenChange={() => { setSelectedAttachment(null); setPreviewUrl(null); }}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                {selectedAttachment?.filename}
              </DialogTitle>
              <DialogDescription>
                {selectedAttachment?.emails?.subject}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[70vh]">
              {previewUrl && selectedAttachment?.mime_type.startsWith('image/') && (
                <div className="mb-4">
                  <img src={previewUrl} alt={selectedAttachment.filename} className="max-w-full rounded-lg" />
                </div>
              )}

              {previewUrl && selectedAttachment?.mime_type === 'application/pdf' && (
                <div className="mb-4 h-[500px]">
                  <iframe src={previewUrl} className="w-full h-full rounded-lg" title={selectedAttachment.filename} />
                </div>
              )}

              {selectedAttachment?.ai_analysis && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Analyse IA</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(() => {
                        const analysis = selectedAttachment.ai_analysis as AttachmentAnalysis;
                        return (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Type de document</p>
                                <p className="font-medium">{analysis.document_type || 'Inconnu'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Sévérité</p>
                                <Badge className={getSeverityColor(analysis.severity)}>
                                  {analysis.severity?.toUpperCase() || 'N/A'}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Document officiel</p>
                                <p className="font-medium">{analysis.is_official ? 'Oui' : 'Non'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Recommandé</p>
                                <p className="font-medium">{analysis.is_registered_mail ? 'Oui' : 'Non'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Pupille impliqué</p>
                                <p className="font-medium">
                                  {analysis.pupille_involved === null ? 'Inconnu' : analysis.pupille_involved ? 'Oui' : 'Non'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Problèmes de consentement</p>
                                <p className="font-medium">{analysis.consent_issues ? 'Oui' : 'Non'}</p>
                              </div>
                            </div>

                            {analysis.summary && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Résumé</p>
                                <p className="p-3 bg-muted/50 rounded-lg">{analysis.summary}</p>
                              </div>
                            )}

                            {analysis.legal_implications && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Implications juridiques</p>
                                <p className="p-3 bg-muted/50 rounded-lg">{analysis.legal_implications}</p>
                              </div>
                            )}

                            {analysis.key_elements && analysis.key_elements.length > 0 && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Éléments clés</p>
                                <div className="flex flex-wrap gap-1">
                                  {analysis.key_elements.map((el, i) => (
                                    <Badge key={i} variant="secondary">{el}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {analysis.legal_violations && analysis.legal_violations.length > 0 && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Violations légales</p>
                                <div className="flex flex-wrap gap-1">
                                  {analysis.legal_violations.map((v, i) => {
                                    // Handle both string and object formats
                                    const displayText = typeof v === 'string' 
                                      ? v 
                                      : (v as any)?.issue || (v as any)?.legal_article || 'Violation';
                                    return (
                                      <Badge key={i} variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
                                        <Scale className="h-3 w-3 mr-1" />
                                        {displayText}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {analysis.recommended_actions && analysis.recommended_actions.length > 0 && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Actions recommandées</p>
                                <ul className="list-disc list-inside space-y-1">
                                  {analysis.recommended_actions.map((action, i) => (
                                    <li key={i} className="text-sm">{action}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  {selectedAttachment.extracted_text && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Texte extrait</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg max-h-[300px] overflow-auto">
                          {selectedAttachment.extracted_text}
                        </pre>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
