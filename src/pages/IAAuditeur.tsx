import { useState } from 'react';
import { Brain, Loader2, AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { AIAnalysisResult } from '@/types/incident';

export default function IAAuditeur() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);

  const analyzeText = async () => {
    if (!input.trim()) {
      toast({
        title: "Texte requis",
        description: "Veuillez coller un email ou du texte à analyser.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-incident', {
        body: { text: input }
      });

      if (error) throw error;
      
      setResult(data);
    } catch (error) {
      console.error('AI analysis error:', error);
      toast({
        title: "Erreur d'analyse",
        description: "Impossible d'analyser le texte. Réessayez.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createIncidentFromResult = () => {
    if (!result) return;
    
    sessionStorage.setItem('ia-prefill', JSON.stringify({
      titre: result.resume.substring(0, 100),
      faits: result.constats.join('\n'),
      dysfonctionnement: result.dysfonctionnements.join('\n'),
      type: result.typeSuggere,
      gravite: result.graviteSuggere
    }));
    
    navigate('/nouveau');
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl">
        <PageHeader 
          title="IA Auditeur factuel" 
          description="Analysez des emails ou documents"
        />

        {/* Input */}
        <Card className="mb-4 md:mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Texte à analyser
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Collez ici un email, un résumé ou tout texte décrivant un incident potentiel..."
              rows={8}
              className="font-mono text-sm"
            />
            <div className="flex justify-end">
              <Button onClick={analyzeText} disabled={loading || !input.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyse...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Analyser
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result */}
        {result && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Résultat
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  Confiance: {Math.round(result.confiance * 100)}%
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              {/* Résumé */}
              <div>
                <h3 className="font-medium mb-2 text-sm md:text-base">Résumé</h3>
                <p className="text-sm text-muted-foreground">{result.resume}</p>
              </div>

              {/* Constats */}
              <div>
                <h3 className="font-medium mb-2 text-sm md:text-base">Constats extraits</h3>
                {result.constats.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {result.constats.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Non déterminable</p>
                )}
              </div>

              {/* Dysfonctionnements */}
              <div>
                <h3 className="font-medium mb-2 text-sm md:text-base">Dysfonctionnements</h3>
                {result.dysfonctionnements.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {result.dysfonctionnements.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Non déterminable</p>
                )}
              </div>

              {/* Suggestions */}
              <div className="grid grid-cols-2 gap-4 p-3 md:p-4 rounded-lg bg-muted">
                <div>
                  <p className="text-xs text-muted-foreground">Type suggéré</p>
                  <p className="font-medium text-sm">{result.typeSuggere || 'Non déterminable'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gravité suggérée</p>
                  <p className="font-medium text-sm">{result.graviteSuggere || 'Non déterminable'}</p>
                </div>
              </div>

              {/* Action */}
              <div className="flex justify-end">
                <Button onClick={createIncidentFromResult}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer incident
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        {!result && !loading && (
          <Card className="border-dashed">
            <CardContent className="py-6 md:py-8 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium mb-2 text-sm md:text-base">Analyse factuelle anti-hallucination</h3>
              <p className="text-xs md:text-sm text-muted-foreground max-w-md mx-auto">
                L'IA extrait uniquement les informations présentes dans le texte.
                Si une information n'est pas disponible, elle sera marquée "Non déterminable".
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
