import { useState, useEffect } from 'react';
import { FileText, Download, RefreshCw, Loader2, Calendar, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FactualTimeline } from '@/components/factual/FactualTimeline';
import { DysfunctionList } from '@/components/factual/DysfunctionList';
import { ActorsSummary } from '@/components/factual/ActorsSummary';
import { generateFactualPDF, EmailFact, Dysfunction, Actor, Stats } from '@/utils/generateFactualPDF';


export default function FactualDossier() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [facts, setFacts] = useState<EmailFact[]>([]);
  const [dysfunctions, setDysfunctions] = useState<Dysfunction[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load email facts with email details
      const { data: factsData, error: factsError } = await supabase
        .from('email_facts')
        .select(`
          *,
          email:emails(subject, body, received_at, sender)
        `)
        .order('extracted_at', { ascending: false })
        .limit(500);

      if (factsError) throw factsError;

      const loadedFacts = (factsData || []) as unknown as EmailFact[];
      setFacts(loadedFacts);

      // Extract dysfunctions from facts
      const extractedDysfunctions = extractDysfunctions(loadedFacts);
      setDysfunctions(extractedDysfunctions);

      // Build actors summary
      const actorsSummary = buildActorsSummary(loadedFacts, extractedDysfunctions);
      setActors(actorsSummary);

      // Calculate stats
      const calculatedStats = calculateStats(loadedFacts, extractedDysfunctions);
      setStats(calculatedStats);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const extractDysfunctions = (facts: EmailFact[]): Dysfunction[] => {
    const dysfunctions: Dysfunction[] = [];

    for (const fact of facts) {
      // Check for urgency issues
      if (fact.urgency_level === 'high') {
        dysfunctions.push({
          id: `${fact.id}-urgency`,
          type: 'Urgence non traitée',
          description: `Email urgent de ${fact.sender_name || fact.sender_email || 'inconnu'}`,
          date: fact.email?.received_at || fact.extracted_at,
          proof: fact.email?.subject || 'Email',
          emailId: fact.email_id,
          severity: 'high'
        });
      }

      // Check for action items not addressed
      if (fact.action_items && fact.action_items.length > 0) {
        for (const action of fact.action_items) {
          dysfunctions.push({
            id: `${fact.id}-action-${dysfunctions.length}`,
            type: 'Action requise',
            description: action.slice(0, 200),
            date: fact.email?.received_at || fact.extracted_at,
            proof: fact.email?.subject || 'Email',
            emailId: fact.email_id,
            severity: 'medium'
          });
        }
      }

      // Check for negative sentiment patterns
      if (fact.sentiment === 'negative' && fact.key_phrases) {
        const problemPhrases = fact.key_phrases.filter(p => 
          p.toLowerCase().includes('problème') ||
          p.toLowerCase().includes('refus') ||
          p.toLowerCase().includes('manquement') ||
          p.toLowerCase().includes('sans réponse') ||
          p.toLowerCase().includes('retard')
        );

        for (const phrase of problemPhrases) {
          dysfunctions.push({
            id: `${fact.id}-phrase-${dysfunctions.length}`,
            type: 'Dysfonctionnement détecté',
            description: phrase.slice(0, 200),
            date: fact.email?.received_at || fact.extracted_at,
            proof: fact.email?.subject || 'Email',
            emailId: fact.email_id,
            severity: fact.urgency_level === 'high' ? 'high' : 'medium'
          });
        }
      }

      // Check for citations indicating problems
      if (fact.raw_citations) {
        for (const citation of fact.raw_citations) {
          const lowerText = citation.text.toLowerCase();
          if (
            lowerText.includes('refuse') ||
            lowerText.includes('rejette') ||
            lowerText.includes('impossible') ||
            lowerText.includes('manque') ||
            lowerText.includes('délai') ||
            lowerText.includes('absence')
          ) {
            dysfunctions.push({
              id: `${fact.id}-citation-${dysfunctions.length}`,
              type: 'Citation problématique',
              description: citation.text.slice(0, 200),
              date: fact.email?.received_at || fact.extracted_at,
              proof: fact.email?.subject || 'Email',
              emailId: fact.email_id,
              severity: 'medium'
            });
          }
        }
      }
    }

    // Remove duplicates and sort by date
    const uniqueDysfunctions = dysfunctions.reduce((acc, current) => {
      const exists = acc.find(d => d.description === current.description);
      if (!exists) acc.push(current);
      return acc;
    }, [] as Dysfunction[]);

    return uniqueDysfunctions.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  const buildActorsSummary = (facts: EmailFact[], dysfunctions: Dysfunction[]): Actor[] => {
    const actorsMap = new Map<string, Actor>();

    for (const fact of facts) {
      const key = fact.sender_email || fact.sender_name || 'Inconnu';
      
      if (!actorsMap.has(key)) {
        actorsMap.set(key, {
          name: fact.sender_name || key,
          email: fact.sender_email || undefined,
          institution: fact.mentioned_institutions?.[0] || undefined,
          emailCount: 0,
          dysfunctionCount: 0,
          lastContact: fact.email?.received_at || fact.extracted_at
        });
      }

      const actor = actorsMap.get(key)!;
      actor.emailCount++;

      const actorDate = new Date(fact.email?.received_at || fact.extracted_at);
      if (actorDate > new Date(actor.lastContact)) {
        actor.lastContact = fact.email?.received_at || fact.extracted_at;
      }
    }

    // Count dysfunctions per actor
    for (const dysfunction of dysfunctions) {
      const relatedFact = facts.find(f => f.email_id === dysfunction.emailId);
      if (relatedFact) {
        const key = relatedFact.sender_email || relatedFact.sender_name || 'Inconnu';
        const actor = actorsMap.get(key);
        if (actor) {
          actor.dysfunctionCount++;
        }
      }
    }

    return Array.from(actorsMap.values())
      .sort((a, b) => b.emailCount - a.emailCount)
      .slice(0, 20);
  };

  const calculateStats = (facts: EmailFact[], dysfunctions: Dysfunction[]): Stats => {
    const dates = facts
      .map(f => new Date(f.email?.received_at || f.extracted_at))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      totalEmails: new Set(facts.map(f => f.email_id)).size,
      totalFacts: facts.length,
      totalDysfunctions: dysfunctions.length,
      avgResponseDays: 0, // Would need more data to calculate
      dateRange: {
        start: dates[0]?.toISOString().split('T')[0] || 'N/A',
        end: dates[dates.length - 1]?.toISOString().split('T')[0] || 'N/A'
      }
    };
  };

  const runFactExtraction = async () => {
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-email-facts', {
        body: { batchSize: 100 }
      });

      if (error) throw error;

      toast({
        title: "Extraction terminée",
        description: `${data.results.processed} emails traités`
      });

      await loadData();
    } catch (error) {
      console.error('Extraction error:', error);
      toast({
        title: "Erreur d'extraction",
        description: "Impossible d'extraire les faits",
        variant: "destructive"
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!stats) return;
    
    setGenerating(true);
    try {
      await generateFactualPDF({
        facts,
        dysfunctions,
        actors,
        stats
      });

      toast({
        title: "PDF généré",
        description: "Le dossier factuel a été téléchargé"
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le PDF",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader 
          title="Dossier Factuel"
          description="Vue factuelle pour le Juge de Paix - Faits, dysfonctionnements et chronologie"
        />

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={runFactExtraction} 
            disabled={extracting}
            variant="outline"
          >
            {extracting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Extraction...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Extraire les faits
              </>
            )}
          </Button>

          <Button 
            onClick={handleGeneratePDF} 
            disabled={generating || !stats}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Télécharger PDF
              </>
            )}
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <FileText className="h-4 w-4" />
                  <span className="text-xs">Emails analysés</span>
                </div>
                <p className="text-2xl font-bold">{stats.totalEmails}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs">Dysfonctionnements</span>
                </div>
                <p className="text-2xl font-bold text-destructive">{stats.totalDysfunctions}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-xs">Acteurs</span>
                </div>
                <p className="text-2xl font-bold">{actors.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs">Période</span>
                </div>
                <p className="text-sm font-medium">
                  {stats.dateRange.start} → {stats.dateRange.end}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Chargement des données...</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="timeline" className="space-y-4">
            <TabsList>
              <TabsTrigger value="timeline">
                <Calendar className="h-4 w-4 mr-2" />
                Chronologie
              </TabsTrigger>
              <TabsTrigger value="dysfunctions">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Dysfonctionnements ({dysfunctions.length})
              </TabsTrigger>
              <TabsTrigger value="actors">
                <Users className="h-4 w-4 mr-2" />
                Acteurs ({actors.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline">
              <FactualTimeline facts={facts} />
            </TabsContent>

            <TabsContent value="dysfunctions">
              <DysfunctionList dysfunctions={dysfunctions} />
            </TabsContent>

            <TabsContent value="actors">
              <ActorsSummary actors={actors} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
