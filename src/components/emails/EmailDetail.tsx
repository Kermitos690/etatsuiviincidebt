import React, { memo } from 'react';
import {
  Mail, AlertTriangle, Check, Clock, Brain, MessageSquare, ArrowRight,
  Scale, Paperclip, Download, Loader2, FileText, Image, File, X,
  ChevronLeft, Building2, RefreshCw, Zap, Trash2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Email, EmailAttachment, AdvancedAnalysis } from './types';

interface EmailDetailProps {
  email: Email;
  attachments: EmailAttachment[];
  loadingAttachments: boolean;
  analyzingAttachment: string | null;
  isProcessing: boolean;
  isAdvancedAnalyzing: boolean;
  onClose: () => void;
  onAnalyze: () => void;
  onAdvancedAnalyze: () => void;
  onCreateIncident: () => void;
  onGenerateResponse: () => void;
  onAnalyzeAttachment: (id: string) => void;
  onDownloadAttachment: (attachment: EmailAttachment) => void;
  onDelete?: () => void;
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 80) return 'from-emerald-400 to-emerald-600';
  if (confidence >= 60) return 'from-amber-400 to-orange-500';
  return 'from-red-400 to-red-600';
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

const formatFullDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

function EmailDetailInner({
  email,
  attachments,
  loadingAttachments,
  analyzingAttachment,
  isProcessing,
  isAdvancedAnalyzing,
  onClose,
  onAnalyze,
  onAdvancedAnalyze,
  onCreateIncident,
  onGenerateResponse,
  onAnalyzeAttachment,
  onDownloadAttachment,
  onDelete,
}: EmailDetailProps) {
  const analysis = email.ai_analysis;
  const threadAnalysis = email.thread_analysis;

  return (
    <div className="h-full flex flex-col bg-background rounded-2xl border border-border/50 overflow-hidden animate-slide-in-right">
      {/* Header - Sticky */}
      <div className="flex-shrink-0 p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          {/* Mobile back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="lg:hidden h-9 w-9 p-0 flex-shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg leading-tight line-clamp-2">{email.subject}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{email.sender}</span>
              <ArrowRight className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{email.recipient || 'Moi'}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatFullDate(email.received_at)}
            </p>
          </div>

          {/* Confidence badge */}
          {analysis?.confidence && (
            <div className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-xl bg-gradient-to-r text-white font-bold text-sm",
              getConfidenceColor(analysis.confidence)
            )}>
              {analysis.confidence}%
            </div>
          )}
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {email.incident_id ? (
            <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
              <Check className="h-3 w-3 mr-1" />
              Incident créé
            </Badge>
          ) : analysis?.isIncident ? (
            <Badge className="bg-destructive/20 text-destructive border-destructive/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Incident détecté
            </Badge>
          ) : email.processed ? (
            <Badge variant="secondary">
              <Check className="h-3 w-3 mr-1" />
              Analysé
            </Badge>
          ) : (
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              En attente
            </Badge>
          )}
          {analysis?.suggestedInstitution && (
            <Badge variant="secondary">
              <Building2 className="h-3 w-3 mr-1" />
              {analysis.suggestedInstitution}
            </Badge>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="email" className="h-full flex flex-col">
          <TabsList className="flex-shrink-0 mx-4 mt-4 grid grid-cols-3 h-10">
            <TabsTrigger value="email" className="text-xs sm:text-sm">
              <Mail className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Email
            </TabsTrigger>
            <TabsTrigger value="analysis" className="text-xs sm:text-sm">
              <Brain className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Analyse
            </TabsTrigger>
            <TabsTrigger value="attachments" className="text-xs sm:text-sm">
              <Paperclip className="h-4 w-4 mr-1.5 hidden sm:inline" />
              PJ ({attachments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="flex-1 overflow-hidden m-0 p-4">
            <ScrollArea className="h-full rounded-xl bg-secondary/30 p-4">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{email.body}</p>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="analysis" className="flex-1 overflow-hidden m-0 p-4">
            <ScrollArea className="h-full">
              {analysis ? (
                <div className="space-y-4">
                  {/* Summary */}
                  {analysis.summary && (
                    <div className="p-4 rounded-xl bg-secondary/50">
                      <h4 className="font-semibold text-sm mb-2">Résumé</h4>
                      <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                    </div>
                  )}

                  {/* Suggested classification */}
                  {analysis.isIncident && (
                    <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                      <h4 className="font-semibold text-sm mb-3 text-destructive">Classification suggérée</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <p className="font-medium">{analysis.suggestedType}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Gravité:</span>
                          <p className="font-medium">{analysis.suggestedGravity}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Thread analysis if available */}
                  {threadAnalysis && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Scale className="h-4 w-4 text-primary" />
                        Analyse du thread
                      </h4>

                      {/* Problem score */}
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm">Score de problème</span>
                          <span className="font-bold">{threadAnalysis.problem_score}/100</span>
                        </div>
                        <Progress value={threadAnalysis.problem_score} className="h-2" />
                      </div>

                      {/* Issues detected */}
                      {threadAnalysis.deadline_violations?.detected && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <h5 className="font-medium text-sm text-amber-600 dark:text-amber-400 mb-1">
                            Violations de délais
                          </h5>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {threadAnalysis.deadline_violations.details.slice(0, 3).map((d, i) => (
                              <li key={i}>• {d}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {threadAnalysis.rule_violations?.detected && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                          <h5 className="font-medium text-sm text-destructive mb-1">
                            Violations de règles
                          </h5>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {threadAnalysis.rule_violations.violations.slice(0, 3).map((v, i) => (
                              <li key={i}>• {v}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommendations */}
                      {threadAnalysis.recommendations?.length > 0 && (
                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                          <h5 className="font-medium text-sm text-primary mb-1">Recommandations</h5>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {threadAnalysis.recommendations.slice(0, 3).map((r, i) => (
                              <li key={i}>• {r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
                    <Brain className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">Pas encore analysé</p>
                  <Button onClick={onAnalyze} disabled={isProcessing}>
                    <Brain className={cn("h-4 w-4 mr-2", isProcessing && "animate-spin")} />
                    Lancer l'analyse
                  </Button>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="attachments" className="flex-1 overflow-hidden m-0 p-4">
            <ScrollArea className="h-full">
              {loadingAttachments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : attachments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Aucune pièce jointe</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {attachments.map((att) => {
                    const AttIcon = getAttachmentIcon(att.mime_type);
                    const isAnalyzing = analyzingAttachment === att.id;

                    return (
                      <div
                        key={att.id}
                        className="p-3 rounded-xl bg-secondary/50 hover:bg-secondary/70 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            att.ai_analysis ? "bg-primary" : "bg-secondary"
                          )}>
                            <AttIcon className={cn(
                              "h-5 w-5",
                              att.ai_analysis ? "text-white" : "text-muted-foreground"
                            )} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{att.filename}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(att.size_bytes)}</p>

                            {att.ai_analysis && (
                              <div className="mt-2 p-2 rounded-lg bg-background/50">
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {att.ai_analysis.summary}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-1">
                            {!att.ai_analysis && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onAnalyzeAttachment(att.id)}
                                disabled={isAnalyzing}
                                className="h-8 w-8 p-0"
                              >
                                <Brain className={cn("h-4 w-4", isAnalyzing && "animate-spin")} />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDownloadAttachment(att)}
                              className="h-8 w-8 p-0"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Actions footer - Sticky */}
      <div className="flex-shrink-0 p-4 border-t border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onAnalyze}
            disabled={isProcessing}
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className={cn("h-4 w-4 mr-1.5", isProcessing && "animate-spin")} />
            <span className="hidden sm:inline">Réanalyser</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onAdvancedAnalyze}
            disabled={isAdvancedAnalyzing}
            className="flex-1 sm:flex-none"
          >
            <Zap className={cn("h-4 w-4 mr-1.5", isAdvancedAnalyzing && "animate-spin")} />
            <span className="hidden sm:inline">Analyse avancée</span>
          </Button>

          {analysis?.isIncident && !email.incident_id && (
            <Button
              onClick={onCreateIncident}
              size="sm"
              className="flex-1 sm:flex-none bg-gradient-to-r from-destructive to-destructive/80"
            >
              <AlertTriangle className="h-4 w-4 mr-1.5" />
              Créer incident
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateResponse}
            disabled={!analysis}
            className="flex-1 sm:flex-none"
          >
            <MessageSquare className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Répondre</span>
          </Button>

          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="flex-1 sm:flex-none hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Supprimer</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export const EmailDetail = memo(EmailDetailInner);
export default EmailDetail;
