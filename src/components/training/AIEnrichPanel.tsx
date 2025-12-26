import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Scale, Users, Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIEnrichment {
  relationship: 'corroboration' | 'contradiction' | 'unrelated';
  confidence: number;
  reasoning: string;
  common_themes: string[];
  common_actors: string[];
  legal_context: {
    applicable_laws?: string[];
    potential_violations?: string[];
    swiss_institutions_involved?: string[];
  };
  timeline_connection: string;
  recommended_action: 'suggest_merge' | 'keep_separate' | 'needs_review';
}

interface AIEnrichPanelProps {
  enrichment: AIEnrichment | null;
  isLoading?: boolean;
}

export function AIEnrichPanel({ enrichment, isLoading }: AIEnrichPanelProps) {
  if (isLoading) {
    return (
      <Card className="glass-card animate-pulse">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary animate-spin" />
            Analyse IA en cours...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-5/6" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!enrichment) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground">
            <Brain className="h-5 w-5" />
            Analyse IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Swipez vers le haut ou cliquez sur "Analyser avec IA" pour enrichir cette paire
          </p>
        </CardContent>
      </Card>
    );
  }

  const relationshipConfig = {
    corroboration: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/20', label: 'Corroboration' },
    contradiction: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/20', label: 'Contradiction' },
    unrelated: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/20', label: 'Non liés' },
  };

  const config = relationshipConfig[enrichment.relationship];
  const Icon = config.icon;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Analyse IA
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("gap-1", config.color)}>
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
            <span className={cn(
              "text-sm font-medium",
              enrichment.confidence >= 0.7 ? 'text-green-500' :
              enrichment.confidence >= 0.4 ? 'text-yellow-500' : 'text-red-500'
            )}>
              {Math.round(enrichment.confidence * 100)}%
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {/* Reasoning */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Raisonnement
              </h4>
              <p className="text-sm text-muted-foreground">{enrichment.reasoning}</p>
            </div>

            {/* Common themes */}
            {enrichment.common_themes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Thèmes communs</h4>
                <div className="flex flex-wrap gap-1">
                  {enrichment.common_themes.map((theme, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {theme}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Common actors */}
            {enrichment.common_actors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Acteurs communs
                </h4>
                <div className="flex flex-wrap gap-1">
                  {enrichment.common_actors.map((actor, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      👤 {actor}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Legal context */}
            {enrichment.legal_context && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />
                  Contexte juridique suisse
                </h4>
                
                {enrichment.legal_context.applicable_laws?.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs text-muted-foreground">Lois applicables:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {enrichment.legal_context.applicable_laws.map((law, i) => (
                        <Badge key={i} variant="default" className="text-xs">
                          {law}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {enrichment.legal_context.potential_violations?.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs text-muted-foreground">Violations potentielles:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {enrichment.legal_context.potential_violations.map((v, i) => (
                        <Badge key={i} variant="destructive" className="text-xs">
                          ⚠️ {v}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {enrichment.legal_context.swiss_institutions_involved?.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Institutions suisses:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {enrichment.legal_context.swiss_institutions_involved.map((inst, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          🏛️ {inst}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Timeline */}
            {enrichment.timeline_connection && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Connexion chronologique
                </h4>
                <p className="text-sm text-muted-foreground">{enrichment.timeline_connection}</p>
              </div>
            )}

            {/* Recommended action */}
            <div className="pt-2 border-t">
              <h4 className="text-sm font-medium mb-2">Recommandation</h4>
              <Badge variant={
                enrichment.recommended_action === 'suggest_merge' ? 'default' :
                enrichment.recommended_action === 'needs_review' ? 'secondary' : 'outline'
              }>
                {enrichment.recommended_action === 'suggest_merge' ? '🔗 Fusionner' :
                 enrichment.recommended_action === 'needs_review' ? '👁️ À revoir' : '📂 Garder séparé'}
              </Badge>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
