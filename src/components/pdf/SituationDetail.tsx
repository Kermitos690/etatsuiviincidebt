import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, Users, Calendar, FileText, Scale, Lightbulb,
  ChevronDown, ChevronUp, ExternalLink, Clock, CheckCircle,
  XCircle, HelpCircle, Gavel, RefreshCw, Quote
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  PDFFolder, SituationAnalysis, SituationParticipant, 
  SituationTimelineEvent, SituationViolation, SituationContradiction,
  SituationJPAction 
} from './types';

interface SituationDetailProps {
  folder: PDFFolder;
  onClose: () => void;
  onAnalyze: () => void;
  isAnalyzing?: boolean;
}

export function SituationDetail({ folder, onClose, onAnalyze, isAnalyzing }: SituationDetailProps) {
  const [analysis, setAnalysis] = useState<SituationAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    participants: true,
    timeline: false,
    contradictions: true,
    violations: true,
    recommendations: true,
  });

  useEffect(() => {
    fetchAnalysis();
  }, [folder.id]);

  const fetchAnalysis = async () => {
    try {
      const { data, error } = await supabase
        .from('situation_analyses')
        .select('*')
        .eq('folder_id', folder.id)
        .order('analyzed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      // Cast the data to SituationAnalysis type
      if (data) {
        setAnalysis(data as unknown as SituationAnalysis);
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critique':
      case 'critical': return 'text-red-500 bg-red-500/10';
      case 'élevée':
      case 'high': return 'text-orange-500 bg-orange-500/10';
      case 'moyenne':
      case 'medium': return 'text-amber-500 bg-amber-500/10';
      default: return 'text-green-500 bg-green-500/10';
    }
  };

  const getConfidenceIcon = (confidence?: string) => {
    switch (confidence) {
      case 'CERTAIN': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'PROBABLE': return <HelpCircle className="h-4 w-4 text-amber-500" />;
      default: return <XCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-CH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <CardTitle className="flex items-center gap-2 truncate">
              <div 
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: folder.color }}
              />
              {folder.name}
            </CardTitle>
            {folder.institution_concerned && (
              <p className="text-sm text-muted-foreground">{folder.institution_concerned}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {folder.problem_score !== undefined && folder.problem_score > 0 && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-lg px-3 py-1",
                  folder.problem_score >= 70 ? 'text-red-500 border-red-500' :
                  folder.problem_score >= 50 ? 'text-amber-500 border-amber-500' :
                  folder.problem_score >= 30 ? 'text-yellow-500 border-yellow-500' :
                  'text-green-500 border-green-500'
                )}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Score: {folder.problem_score}
              </Badge>
            )}
            <Button onClick={onAnalyze} disabled={isAnalyzing} size="sm">
              <RefreshCw className={cn("h-4 w-4 mr-2", isAnalyzing && "animate-spin")} />
              {isAnalyzing ? 'Analyse...' : 'Ré-analyser'}
            </Button>
          </div>
        </div>
        
        {folder.problem_score !== undefined && (
          <Progress value={folder.problem_score} className="h-2 mt-2" />
        )}
      </CardHeader>

      {!analysis ? (
        <CardContent className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <FileText className="h-16 w-16 text-muted-foreground" />
          <div className="text-center">
            <h3 className="font-semibold">Aucune analyse disponible</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Lancez une analyse pour obtenir un rapport détaillé de cette situation
            </p>
          </div>
          <Button onClick={onAnalyze} disabled={isAnalyzing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isAnalyzing && "animate-spin")} />
            Analyser la situation
          </Button>
        </CardContent>
      ) : (
        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-2 shrink-0">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="timeline">
              Chronologie
              {analysis.timeline?.length > 0 && (
                <Badge variant="secondary" className="ml-1.5">{analysis.timeline.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="violations">
              Violations
              {analysis.violations_detected?.length > 0 && (
                <Badge variant="destructive" className="ml-1.5">{analysis.violations_detected.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="actions">
              Actions JP
              {analysis.jp_actions?.length > 0 && (
                <Badge variant="secondary" className="ml-1.5">{analysis.jp_actions.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-4 pb-4">
            <TabsContent value="overview" className="mt-4 space-y-4">
              {/* Summary Section */}
              <CollapsibleSection
                title="Résumé"
                icon={<FileText className="h-4 w-4" />}
                isExpanded={expandedSections.summary}
                onToggle={() => toggleSection('summary')}
              >
                <p className="text-sm leading-relaxed">{analysis.summary || 'Aucun résumé disponible'}</p>
                {analysis.chronological_summary && (
                  <>
                    <Separator className="my-3" />
                    <div>
                      <h4 className="text-sm font-medium mb-2">Récit chronologique</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {analysis.chronological_summary}
                      </p>
                    </div>
                  </>
                )}
              </CollapsibleSection>

              {/* Participants Section */}
              {analysis.participants && analysis.participants.length > 0 && (
                <CollapsibleSection
                  title={`Participants (${analysis.participants.length})`}
                  icon={<Users className="h-4 w-4" />}
                  isExpanded={expandedSections.participants}
                  onToggle={() => toggleSection('participants')}
                >
                  <div className="grid gap-3">
                    {analysis.participants.map((participant, idx) => (
                      <ParticipantCard key={idx} participant={participant} />
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Contradictions Section */}
              {analysis.contradictions && analysis.contradictions.length > 0 && (
                <CollapsibleSection
                  title={`Contradictions (${analysis.contradictions.length})`}
                  icon={<XCircle className="h-4 w-4 text-red-500" />}
                  isExpanded={expandedSections.contradictions}
                  onToggle={() => toggleSection('contradictions')}
                  variant="warning"
                >
                  <div className="space-y-4">
                    {analysis.contradictions.map((contradiction, idx) => (
                      <ContradictionCard key={idx} contradiction={contradiction} />
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Recommendations Section */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <CollapsibleSection
                  title={`Recommandations (${analysis.recommendations.length})`}
                  icon={<Lightbulb className="h-4 w-4 text-amber-500" />}
                  isExpanded={expandedSections.recommendations}
                  onToggle={() => toggleSection('recommendations')}
                >
                  <div className="space-y-3">
                    {analysis.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <Badge className={cn("shrink-0", getSeverityColor(rec.priority))}>
                          {rec.priority}
                        </Badge>
                        <div className="space-y-1">
                          <p className="text-sm">{rec.action}</p>
                          {rec.legal_basis && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Scale className="h-3 w-3" />
                              {rec.legal_basis}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Metadata */}
              <div className="text-xs text-muted-foreground flex items-center gap-4 pt-4 border-t">
                <span>Analysé le {formatDate(analysis.analyzed_at)}</span>
                <span>{analysis.documents_analyzed} document(s)</span>
                <span>{analysis.total_pages} pages</span>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              {analysis.timeline && analysis.timeline.length > 0 ? (
                <div className="relative pl-6 space-y-4">
                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
                  {analysis.timeline
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((event, idx) => (
                      <TimelineEventCard key={idx} event={event} />
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun événement dans la chronologie</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="violations" className="mt-4 space-y-4">
              {analysis.violations_detected && analysis.violations_detected.length > 0 ? (
                analysis.violations_detected.map((violation, idx) => (
                  <ViolationCard key={idx} violation={violation} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50 text-green-500" />
                  <p>Aucune violation détectée</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="actions" className="mt-4 space-y-4">
              {analysis.jp_actions && analysis.jp_actions.length > 0 ? (
                analysis.jp_actions.map((action, idx) => (
                  <JPActionCard key={idx} action={action} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Gavel className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune action Justice de Paix recommandée</p>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      )}
    </Card>
  );
}

// Sub-components
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'warning';
}

function CollapsibleSection({ title, icon, isExpanded, onToggle, children, variant = 'default' }: CollapsibleSectionProps) {
  return (
    <div className={cn(
      "border rounded-lg overflow-hidden",
      variant === 'warning' && "border-amber-500/50"
    )}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 font-medium text-sm">
          {icon}
          {title}
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {isExpanded && (
        <div className="px-3 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}

function ParticipantCard({ participant }: { participant: SituationParticipant }) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-medium text-sm">{participant.name}</div>
        {participant.role && (
          <Badge variant="outline" className="text-xs">{participant.role}</Badge>
        )}
      </div>
      {participant.institution && (
        <p className="text-xs text-muted-foreground">{participant.institution}</p>
      )}
      {participant.first_mention?.citation && (
        <div className="text-xs p-2 bg-background rounded border-l-2 border-primary">
          <Quote className="h-3 w-3 inline mr-1 text-muted-foreground" />
          <span className="italic">"{participant.first_mention.citation}"</span>
          <span className="text-muted-foreground ml-1">— {participant.first_mention.source}</span>
        </div>
      )}
      {participant.trust_indicators && (
        <div className="flex gap-2 text-xs">
          {participant.trust_indicators.positive?.length > 0 && (
            <Badge variant="outline" className="text-green-500 border-green-500">
              +{participant.trust_indicators.positive.length} positif
            </Badge>
          )}
          {participant.trust_indicators.negative?.length > 0 && (
            <Badge variant="outline" className="text-red-500 border-red-500">
              -{participant.trust_indicators.negative.length} négatif
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

function ContradictionCard({ contradiction }: { contradiction: SituationContradiction }) {
  return (
    <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-red-500 border-red-500">
          {contradiction.severity}
        </Badge>
        <span className="text-xs text-muted-foreground">{contradiction.type}</span>
      </div>
      <p className="text-sm">{contradiction.description}</p>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="p-2 bg-background rounded text-xs space-y-1">
          <p className="font-medium">{contradiction.document_1.source}</p>
          <p className="italic text-muted-foreground">"{contradiction.document_1.citation}"</p>
        </div>
        <div className="p-2 bg-background rounded text-xs space-y-1">
          <p className="font-medium">{contradiction.document_2.source}</p>
          <p className="italic text-muted-foreground">"{contradiction.document_2.citation}"</p>
        </div>
      </div>
      {contradiction.analysis && (
        <p className="text-xs text-muted-foreground">{contradiction.analysis}</p>
      )}
    </div>
  );
}

function TimelineEventCard({ event }: { event: SituationTimelineEvent }) {
  const importanceColors = {
    critique: 'bg-red-500',
    haute: 'bg-orange-500',
    moyenne: 'bg-amber-500',
    faible: 'bg-blue-500',
  };

  return (
    <div className="relative">
      <div className={cn(
        "absolute -left-4 w-3 h-3 rounded-full border-2 border-background",
        importanceColors[event.importance as keyof typeof importanceColors] || 'bg-gray-500'
      )} />
      <div className="p-3 bg-muted/50 rounded-lg space-y-1">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            {new Date(event.date).toLocaleDateString('fr-CH')}
          </Badge>
          {event.importance && (
            <Badge className={cn("text-xs text-white", importanceColors[event.importance as keyof typeof importanceColors] || 'bg-gray-500')}>
              {event.importance}
            </Badge>
          )}
        </div>
        <p className="text-sm">{event.event}</p>
        {event.citation && (
          <p className="text-xs italic text-muted-foreground border-l-2 border-primary pl-2">
            "{event.citation}"
          </p>
        )}
        <p className="text-xs text-muted-foreground">{event.source}</p>
        {event.actors_involved && event.actors_involved.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {event.actors_involved.map((actor, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">{actor}</Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ViolationCard({ violation }: { violation: SituationViolation }) {
  const severityColors = {
    critique: 'border-red-500 bg-red-500/5',
    élevée: 'border-orange-500 bg-orange-500/5',
    moyenne: 'border-amber-500 bg-amber-500/5',
    faible: 'border-blue-500 bg-blue-500/5',
  };

  return (
    <div className={cn(
      "p-4 rounded-lg border-l-4 space-y-3",
      severityColors[violation.severity as keyof typeof severityColors] || 'border-gray-500 bg-gray-500/5'
    )}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <Badge className={cn("mb-2", 
            violation.severity === 'critique' ? 'bg-red-500' :
            violation.severity === 'élevée' ? 'bg-orange-500' :
            violation.severity === 'moyenne' ? 'bg-amber-500' : 'bg-blue-500'
          )}>
            {violation.severity}
          </Badge>
          <h4 className="font-medium text-sm">{violation.type}</h4>
        </div>
        <div className="flex items-center gap-1">
          {violation.confidence === 'CERTAIN' ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : violation.confidence === 'PROBABLE' ? (
            <HelpCircle className="h-4 w-4 text-amber-500" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">{violation.confidence}</span>
        </div>
      </div>
      
      <p className="text-sm">{violation.description}</p>
      
      {violation.citations && violation.citations.length > 0 && (
        <div className="space-y-2">
          {violation.citations.map((citation, idx) => (
            <div key={idx} className="text-xs p-2 bg-background rounded border-l-2 border-primary">
              <Quote className="h-3 w-3 inline mr-1 text-muted-foreground" />
              <span className="italic">"{citation.text}"</span>
              <span className="text-muted-foreground ml-1">— {citation.source}</span>
            </div>
          ))}
        </div>
      )}

      {violation.legal_references && violation.legal_references.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {violation.legal_references.map((ref, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              <Scale className="h-3 w-3 mr-1" />
              {ref.article}
            </Badge>
          ))}
        </div>
      )}

      {violation.actors_responsible && violation.actors_responsible.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          Responsables: {violation.actors_responsible.join(', ')}
        </div>
      )}
    </div>
  );
}

function JPActionCard({ action }: { action: SituationJPAction }) {
  const urgencyColors = {
    immédiate: 'bg-red-500 text-white',
    court_terme: 'bg-amber-500 text-white',
    moyen_terme: 'bg-blue-500 text-white',
  };

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-start justify-between">
        <Badge className={cn(urgencyColors[action.urgency as keyof typeof urgencyColors] || 'bg-gray-500')}>
          <Clock className="h-3 w-3 mr-1" />
          {action.urgency === 'immédiate' ? 'Immédiat' : 
           action.urgency === 'court_terme' ? 'Court terme' : 'Moyen terme'}
        </Badge>
        <Gavel className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <p className="font-medium text-sm">{action.action}</p>
      
      {action.legal_basis && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Scale className="h-3 w-3" />
          {action.legal_basis}
        </div>
      )}
      
      {action.documents_to_attach && action.documents_to_attach.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Documents à joindre:</p>
          <div className="flex flex-wrap gap-1">
            {action.documents_to_attach.map((doc, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                {doc}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
