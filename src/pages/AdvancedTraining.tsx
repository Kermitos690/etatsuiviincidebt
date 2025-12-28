import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SituationCard } from '@/components/training/SituationCard';
import { TrainingDashboard } from '@/components/training/TrainingDashboard';
import { LegalReferenceManager } from '@/components/training/LegalReferenceManager';
import { PatternManager } from '@/components/training/PatternManager';
import { ThreadLinker } from '@/components/training/ThreadLinker';
import { useActivelearning } from '@/hooks/useActiveLearning';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Brain, 
  RefreshCw, 
  Sparkles, 
  Scale, 
  Loader2,
  Tag,
  Link2
} from 'lucide-react';

export default function AdvancedTraining() {
  const isMobile = useIsMobile();
  const { 
    situations, 
    stats, 
    isLoading, 
    isGenerating,
    generateSituations,
    validateSituation,
    fetchPendingSituations
  } = useActivelearning();

  return (
    <div className="container mx-auto p-4 space-y-6 h-full min-h-0 flex flex-col">
      <PageHeader
        title="Entraînement IA Avancé"
        description="Validez les détections, gérez les patterns et liez les conversations"
        icon={<Brain className="h-7 w-7 text-white" />}
      />

      <TrainingDashboard stats={stats} />

      <Tabs defaultValue="situations" className="space-y-4 flex-1">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="situations" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Situations
          </TabsTrigger>
          <TabsTrigger value="patterns" className="gap-2">
            <Tag className="h-4 w-4" />
            Patterns
          </TabsTrigger>
          <TabsTrigger value="threads" className="gap-2">
            <Link2 className="h-4 w-4" />
            Threads
          </TabsTrigger>
          <TabsTrigger value="legal" className="gap-2">
            <Scale className="h-4 w-4" />
            Références
          </TabsTrigger>
        </TabsList>

        <TabsContent value="situations" className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={generateSituations} disabled={isGenerating} className="gap-2">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Générer
            </Button>
            <Button variant="outline" onClick={fetchPendingSituations} disabled={isLoading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <div className="text-sm text-muted-foreground ml-auto">
              {situations.length} en attente
            </div>
          </div>

          <div className={isMobile ? "space-y-4 pb-4" : "flex-1 min-h-0 overflow-y-auto space-y-4 pr-2"}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : situations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Brain className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Aucune situation en attente</p>
                <p className="text-sm mt-2">Cliquez sur "Générer" pour analyser vos emails</p>
              </div>
            ) : (
              situations.map(situation => (
                <SituationCard key={situation.id} situation={situation} onValidate={validateSituation} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="patterns">
          <PatternManager />
        </TabsContent>

        <TabsContent value="threads">
          <ThreadLinker />
        </TabsContent>

        <TabsContent value="legal">
          <LegalReferenceManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
