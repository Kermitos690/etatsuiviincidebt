import React, { useState } from 'react';
import { 
  FileText, Brain, Clock, Users, AlertTriangle, CheckCircle, 
  Download, Trash2, X, Loader2, BookOpen, Scale, Target,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { PDFDocument } from './types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PDFDetailProps {
  document: PDFDocument;
  onClose: () => void;
  onAnalyze: () => void;
  onExtractText: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onCreateIncident: () => void;
  isAnalyzing: boolean;
  isExtracting: boolean;
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-500/20 text-red-500 border-red-500/30';
    case 'high': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
    case 'medium': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    case 'low': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
    default: return 'bg-green-500/20 text-green-500 border-green-500/30';
  }
}

function getImportanceColor(importance: string): string {
  switch (importance) {
    case 'critical': return 'border-l-red-500 bg-red-500/5';
    case 'high': return 'border-l-orange-500 bg-orange-500/5';
    case 'medium': return 'border-l-yellow-500 bg-yellow-500/5';
    default: return 'border-l-blue-500 bg-blue-500/5';
  }
}

export function PDFDetail({
  document,
  onClose,
  onAnalyze,
  onExtractText,
  onDelete,
  onDownload,
  onCreateIncident,
  isAnalyzing,
  isExtracting,
}: PDFDetailProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    violations: true,
    timeline: true,
    participants: true,
  });

  const analysis = document.analysis;
  const threadAnalysis = analysis?.thread_analysis;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const problemScore = analysis?.problem_score || 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-3 rounded-xl",
            analysis ? getSeverityColor(analysis.severity) : "bg-primary/10 text-primary"
          )}>
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-semibold">{document.original_filename}</h2>
            <p className="text-sm text-muted-foreground">
              {format(new Date(document.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="analysis">Analyse IA</TabsTrigger>
          <TabsTrigger value="text">Texte extrait</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Overview Tab */}
          <TabsContent value="overview" className="p-4 space-y-4">
            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold">{problemScore}</p>
                <p className="text-xs text-muted-foreground">Score problème</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold">
                  {analysis ? Math.round((analysis.confidence_score || 0) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Confiance</p>
              </Card>
            </div>

            {/* Problem score visualization */}
            {problemScore > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Niveau de problème</span>
                  <Badge variant="outline" className={getSeverityColor(analysis?.severity || 'none')}>
                    {analysis?.severity || 'none'}
                  </Badge>
                </div>
                <Progress value={problemScore} className="h-2" />
              </Card>
            )}

            {/* Summary */}
            {analysis?.summary && (
              <Card className="p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Résumé
                </h4>
                <p className="text-sm text-muted-foreground">{analysis.summary}</p>
              </Card>
            )}

            {/* Incident detection */}
            {analysis?.ai_analysis?.isIncident && (
              <Card className="p-4 border-destructive/50 bg-destructive/5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-destructive">Incident détecté</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {analysis.ai_analysis.suggestedTitle}
                    </p>
                    <Button 
                      size="sm" 
                      className="mt-3"
                      onClick={onCreateIncident}
                    >
                      Créer l'incident
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Recommendations */}
            {analysis?.recommendations && analysis.recommendations.length > 0 && (
              <Card className="p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Recommandations
                </h4>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="p-4 space-y-4">
            {!analysis ? (
              <Card className="p-8 text-center">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h4 className="font-medium mb-2">Aucune analyse disponible</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  {document.extraction_status === 'completed' 
                    ? "Lancez l'analyse IA pour détecter les problèmes"
                    : "Extrayez d'abord le texte du PDF"}
                </p>
                <Button 
                  onClick={document.extraction_status === 'completed' ? onAnalyze : onExtractText}
                  disabled={isAnalyzing || isExtracting}
                >
                  {isAnalyzing || isExtracting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4 mr-2" />
                  )}
                  {document.extraction_status === 'completed' ? 'Analyser' : 'Extraire le texte'}
                </Button>
              </Card>
            ) : (
              <>
                {/* Timeline */}
                {analysis.timeline && analysis.timeline.length > 0 && (
                  <Collapsible 
                    open={expandedSections.timeline} 
                    onOpenChange={() => toggleSection('timeline')}
                  >
                    <Card className="p-4">
                      <CollapsibleTrigger className="flex items-center justify-between w-full">
                        <h4 className="font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          Chronologie ({analysis.timeline.length} événements)
                        </h4>
                        {expandedSections.timeline ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3">
                        <div className="space-y-2">
                          {analysis.timeline.map((event, i) => (
                            <div 
                              key={i}
                              className={cn(
                                "pl-3 py-2 border-l-2 rounded-r-lg",
                                getImportanceColor(event.importance)
                              )}
                            >
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{event.date}</span>
                                {event.actor && <span>• {event.actor}</span>}
                              </div>
                              <p className="text-sm mt-1">{event.event}</p>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                {/* Participants */}
                {analysis.participants && analysis.participants.length > 0 && (
                  <Collapsible 
                    open={expandedSections.participants} 
                    onOpenChange={() => toggleSection('participants')}
                  >
                    <Card className="p-4">
                      <CollapsibleTrigger className="flex items-center justify-between w-full">
                        <h4 className="font-medium flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          Participants ({analysis.participants.length})
                        </h4>
                        {expandedSections.participants ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3">
                        <div className="grid gap-2">
                          {analysis.participants.map((p, i) => (
                            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                {p.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{p.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {p.role} {p.institution && `• ${p.institution}`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                {/* Violations */}
                {threadAnalysis && (
                  <Collapsible 
                    open={expandedSections.violations} 
                    onOpenChange={() => toggleSection('violations')}
                  >
                    <Card className="p-4">
                      <CollapsibleTrigger className="flex items-center justify-between w-full">
                        <h4 className="font-medium flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          Problèmes détectés
                        </h4>
                        {expandedSections.violations ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3 space-y-3">
                        {threadAnalysis.deadline_violations?.detected && (
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <h5 className="text-sm font-medium text-red-500 mb-1">Violations de délais</h5>
                            <ul className="text-sm space-y-1">
                              {threadAnalysis.deadline_violations.details.map((d, i) => (
                                <li key={i}>• {d}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {threadAnalysis.unanswered_questions?.detected && (
                          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                            <h5 className="text-sm font-medium text-orange-500 mb-1">Questions sans réponse</h5>
                            <ul className="text-sm space-y-1">
                              {threadAnalysis.unanswered_questions.questions.map((q, i) => (
                                <li key={i}>• {q}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {threadAnalysis.contradictions?.detected && (
                          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                            <h5 className="text-sm font-medium text-purple-500 mb-1">Contradictions</h5>
                            <ul className="text-sm space-y-1">
                              {threadAnalysis.contradictions.details.map((d, i) => (
                                <li key={i}>• {d}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {threadAnalysis.rule_violations?.detected && (
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <h5 className="text-sm font-medium text-red-500 mb-1">Violations de règles</h5>
                            <ul className="text-sm space-y-1">
                              {threadAnalysis.rule_violations.violations.map((v, i) => (
                                <li key={i}>• {v}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                {/* Legal references */}
                {analysis.legal_references && analysis.legal_references.length > 0 && (
                  <Card className="p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Scale className="h-4 w-4 text-primary" />
                      Références légales
                    </h4>
                    <div className="space-y-2">
                      {analysis.legal_references.map((ref, i) => (
                        <div key={i} className="p-2 rounded-lg bg-muted/50">
                          <p className="text-sm font-medium">{ref.article} - {ref.law}</p>
                          <p className="text-xs text-muted-foreground">{ref.description}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Text Tab */}
          <TabsContent value="text" className="p-4">
            {document.extraction_status === 'completed' && document.extracted_text ? (
              <Card className="p-4">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {document.extracted_text}
                </pre>
              </Card>
            ) : (
              <Card className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h4 className="font-medium mb-2">Texte non extrait</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Extrayez le texte du PDF pour l'afficher ici
                </p>
                <Button onClick={onExtractText} disabled={isExtracting}>
                  {isExtracting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Extraire le texte
                </Button>
              </Card>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Actions footer */}
      <div className="p-4 border-t flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Télécharger
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </div>
        
        <Button 
          onClick={document.extraction_status === 'completed' ? onAnalyze : onExtractText}
          disabled={isAnalyzing || isExtracting}
        >
          {isAnalyzing || isExtracting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Brain className="h-4 w-4 mr-2" />
          )}
          {document.extraction_status === 'completed' 
            ? (analysis ? 'Ré-analyser' : 'Analyser')
            : 'Extraire le texte'}
        </Button>
      </div>
    </div>
  );
}
