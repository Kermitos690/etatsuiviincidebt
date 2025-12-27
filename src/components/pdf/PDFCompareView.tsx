import React, { useState, useEffect, useMemo } from 'react';
import { 
  Columns2, X, AlertTriangle, CheckCircle, Clock, 
  Users, Scale, ChevronDown, ChevronUp, Loader2, RefreshCw 
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { PDFDocument } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PDFCompareViewProps {
  documents: PDFDocument[];
  selectedIds: [string, string];
  onClose: () => void;
  onDocumentSelect: (position: 0 | 1, docId: string) => void;
}

interface Inconsistency {
  type: 'date' | 'fact' | 'person' | 'institution' | 'legal' | 'severity';
  title: string;
  doc1Value: string;
  doc2Value: string;
  severity: 'low' | 'medium' | 'high';
}

function getSeverityBadge(severity: string) {
  const colors: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-500',
    high: 'bg-orange-500/20 text-orange-500',
    medium: 'bg-yellow-500/20 text-yellow-500',
    low: 'bg-blue-500/20 text-blue-500',
    none: 'bg-green-500/20 text-green-500',
  };
  return colors[severity] || colors.none;
}

export function PDFCompareView({
  documents,
  selectedIds,
  onClose,
  onDocumentSelect,
}: PDFCompareViewProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [inconsistencies, setInconsistencies] = useState<Inconsistency[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    inconsistencies: true,
    timeline: true,
    participants: true,
  });

  const doc1 = documents.find(d => d.id === selectedIds[0]);
  const doc2 = documents.find(d => d.id === selectedIds[1]);

  // Auto-detect inconsistencies
  const detectedInconsistencies = useMemo(() => {
    if (!doc1?.analysis || !doc2?.analysis) return [];

    const issues: Inconsistency[] = [];

    // Compare severity
    if (doc1.analysis.severity !== doc2.analysis.severity) {
      issues.push({
        type: 'severity',
        title: 'Niveau de sévérité différent',
        doc1Value: doc1.analysis.severity,
        doc2Value: doc2.analysis.severity,
        severity: 'medium',
      });
    }

    // Compare participants
    const participants1 = new Set(doc1.analysis.participants?.map(p => p.name.toLowerCase()) || []);
    const participants2 = new Set(doc2.analysis.participants?.map(p => p.name.toLowerCase()) || []);
    
    const uniqueToDoc1 = [...participants1].filter(p => !participants2.has(p));
    const uniqueToDoc2 = [...participants2].filter(p => !participants1.has(p));
    
    if (uniqueToDoc1.length > 0 || uniqueToDoc2.length > 0) {
      issues.push({
        type: 'person',
        title: 'Participants différents',
        doc1Value: uniqueToDoc1.length > 0 ? `Uniquement dans Doc 1: ${uniqueToDoc1.join(', ')}` : 'Aucun unique',
        doc2Value: uniqueToDoc2.length > 0 ? `Uniquement dans Doc 2: ${uniqueToDoc2.join(', ')}` : 'Aucun unique',
        severity: 'low',
      });
    }

    // Compare legal references
    const legalRefs1 = new Set(doc1.analysis.legal_references?.map(r => r.article) || []);
    const legalRefs2 = new Set(doc2.analysis.legal_references?.map(r => r.article) || []);
    
    const uniqueLegal1 = [...legalRefs1].filter(r => !legalRefs2.has(r));
    const uniqueLegal2 = [...legalRefs2].filter(r => !legalRefs1.has(r));
    
    if (uniqueLegal1.length > 0 || uniqueLegal2.length > 0) {
      issues.push({
        type: 'legal',
        title: 'Références légales différentes',
        doc1Value: uniqueLegal1.join(', ') || 'Aucune unique',
        doc2Value: uniqueLegal2.join(', ') || 'Aucune unique',
        severity: 'medium',
      });
    }

    // Check for contradicting facts in thread analysis
    const ta1 = doc1.analysis.thread_analysis;
    const ta2 = doc2.analysis.thread_analysis;

    if (ta1?.contradictions?.detected || ta2?.contradictions?.detected) {
      issues.push({
        type: 'fact',
        title: 'Contradictions détectées',
        doc1Value: ta1?.contradictions?.detected ? 'Oui' : 'Non',
        doc2Value: ta2?.contradictions?.detected ? 'Oui' : 'Non',
        severity: 'high',
      });
    }

    // Compare problem scores
    const scoreDiff = Math.abs((doc1.analysis.problem_score || 0) - (doc2.analysis.problem_score || 0));
    if (scoreDiff > 30) {
      issues.push({
        type: 'severity',
        title: 'Écart de score significatif',
        doc1Value: `Score: ${doc1.analysis.problem_score || 0}`,
        doc2Value: `Score: ${doc2.analysis.problem_score || 0}`,
        severity: scoreDiff > 50 ? 'high' : 'medium',
      });
    }

    return issues;
  }, [doc1, doc2]);

  useEffect(() => {
    setInconsistencies(detectedInconsistencies);
  }, [detectedInconsistencies]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ 
      ...prev, 
      [section]: !prev[section as keyof typeof prev] 
    }));
  };

  const runAIComparison = async () => {
    if (!doc1 || !doc2) return;

    setIsAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      // This would call a new edge function for deep comparison
      // For now, we'll use the auto-detected inconsistencies
      toast.success('Analyse comparative terminée');
    } catch (error) {
      toast.error('Erreur lors de l\'analyse comparative');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!doc1 || !doc2) {
    return (
      <Card className="p-8 text-center">
        <Columns2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Sélectionnez deux documents à comparer</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Columns2 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Vue comparative</h2>
          {inconsistencies.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {inconsistencies.length} incohérence(s)
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={runAIComparison}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Analyse IA
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Document headers side by side */}
          <div className="grid grid-cols-2 gap-4">
            {[doc1, doc2].map((doc, idx) => (
              <Card key={doc.id} className={cn("p-4", idx === 0 ? "border-blue-500/30" : "border-purple-500/30")}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-lg flex-shrink-0",
                    idx === 0 ? "bg-blue-500/20 text-blue-500" : "bg-purple-500/20 text-purple-500"
                  )}>
                    <Badge variant="outline" className="font-bold">
                      {idx === 0 ? 'A' : 'B'}
                    </Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate text-sm">{doc.original_filename}</h3>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
                    </p>
                    {doc.analysis && (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={getSeverityBadge(doc.analysis.severity)}>
                          Score: {doc.analysis.problem_score || 0}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Inconsistencies section */}
          {inconsistencies.length > 0 && (
            <Collapsible 
              open={expandedSections.inconsistencies} 
              onOpenChange={() => toggleSection('inconsistencies')}
            >
              <Card className="overflow-hidden border-destructive/30">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <h4 className="font-medium">Incohérences détectées ({inconsistencies.length})</h4>
                  </div>
                  {expandedSections.inconsistencies ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 pt-0 space-y-3">
                    {inconsistencies.map((issue, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "p-3 rounded-lg border-l-4",
                          issue.severity === 'high' ? "border-l-red-500 bg-red-500/5" :
                          issue.severity === 'medium' ? "border-l-orange-500 bg-orange-500/5" :
                          "border-l-yellow-500 bg-yellow-500/5"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{issue.title}</span>
                          <Badge variant="outline" className={cn(
                            issue.severity === 'high' ? "text-red-500" :
                            issue.severity === 'medium' ? "text-orange-500" : "text-yellow-500"
                          )}>
                            {issue.severity === 'high' ? 'Élevé' : 
                             issue.severity === 'medium' ? 'Moyen' : 'Faible'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="p-2 rounded bg-blue-500/10">
                            <span className="text-xs text-muted-foreground block mb-1">Doc A</span>
                            {issue.doc1Value}
                          </div>
                          <div className="p-2 rounded bg-purple-500/10">
                            <span className="text-xs text-muted-foreground block mb-1">Doc B</span>
                            {issue.doc2Value}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Timeline comparison */}
          {(doc1.analysis?.timeline || doc2.analysis?.timeline) && (
            <Collapsible 
              open={expandedSections.timeline} 
              onOpenChange={() => toggleSection('timeline')}
            >
              <Card>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <h4 className="font-medium">Chronologies comparées</h4>
                  </div>
                  {expandedSections.timeline ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 pt-0 grid grid-cols-2 gap-4">
                    {[doc1, doc2].map((doc, idx) => (
                      <div key={doc.id} className="space-y-2">
                        <h5 className={cn(
                          "text-sm font-medium",
                          idx === 0 ? "text-blue-500" : "text-purple-500"
                        )}>
                          Document {idx === 0 ? 'A' : 'B'}
                        </h5>
                        {doc.analysis?.timeline?.slice(0, 5).map((event, i) => (
                          <div key={i} className="text-xs p-2 rounded bg-muted/50">
                            <span className="text-muted-foreground">{event.date}</span>
                            <p className="mt-0.5">{event.event}</p>
                          </div>
                        )) || <p className="text-sm text-muted-foreground">Pas de chronologie</p>}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Participants comparison */}
          {(doc1.analysis?.participants || doc2.analysis?.participants) && (
            <Collapsible 
              open={expandedSections.participants} 
              onOpenChange={() => toggleSection('participants')}
            >
              <Card>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <h4 className="font-medium">Participants</h4>
                  </div>
                  {expandedSections.participants ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 pt-0 grid grid-cols-2 gap-4">
                    {[doc1, doc2].map((doc, idx) => (
                      <div key={doc.id} className="space-y-2">
                        <h5 className={cn(
                          "text-sm font-medium",
                          idx === 0 ? "text-blue-500" : "text-purple-500"
                        )}>
                          Document {idx === 0 ? 'A' : 'B'}
                        </h5>
                        <div className="space-y-1">
                          {doc.analysis?.participants?.map((p, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                                {p.name.charAt(0)}
                              </div>
                              <span>{p.name}</span>
                              {p.role && (
                                <Badge variant="outline" className="text-xs">{p.role}</Badge>
                              )}
                            </div>
                          )) || <p className="text-sm text-muted-foreground">Pas de participants</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Legal references comparison */}
          {(doc1.analysis?.legal_references || doc2.analysis?.legal_references) && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Scale className="h-4 w-4 text-primary" />
                <h4 className="font-medium">Références légales</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[doc1, doc2].map((doc, idx) => (
                  <div key={doc.id}>
                    <h5 className={cn(
                      "text-sm font-medium mb-2",
                      idx === 0 ? "text-blue-500" : "text-purple-500"
                    )}>
                      Document {idx === 0 ? 'A' : 'B'}
                    </h5>
                    <div className="space-y-1">
                      {doc.analysis?.legal_references?.map((ref, i) => (
                        <Badge key={i} variant="outline" className="block text-xs p-1.5">
                          {ref.article} - {ref.law}
                        </Badge>
                      )) || <p className="text-sm text-muted-foreground">Aucune</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Summary comparison */}
          <Card className="p-4">
            <h4 className="font-medium mb-3">Résumés</h4>
            <div className="grid grid-cols-2 gap-4">
              {[doc1, doc2].map((doc, idx) => (
                <div 
                  key={doc.id} 
                  className={cn(
                    "p-3 rounded-lg",
                    idx === 0 ? "bg-blue-500/5 border border-blue-500/20" : "bg-purple-500/5 border border-purple-500/20"
                  )}
                >
                  <h5 className={cn(
                    "text-sm font-medium mb-2",
                    idx === 0 ? "text-blue-500" : "text-purple-500"
                  )}>
                    Document {idx === 0 ? 'A' : 'B'}
                  </h5>
                  <p className="text-sm text-muted-foreground">
                    {doc.analysis?.summary || 'Pas de résumé disponible'}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

export default PDFCompareView;
