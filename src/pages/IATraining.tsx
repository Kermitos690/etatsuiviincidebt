 import { useState } from 'react';
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { ChevronLeft, ChevronRight, CheckCircle, RefreshCw, Mail } from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
 import { Textarea } from '@/components/ui/textarea';
 import { Label } from '@/components/ui/label';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { TrainingCard, TrainingStats } from '@/components/training';
 import { ValidationButtons } from '@/components/training/ValidationButtons';
 import { VIOLATION_TYPES } from '@/config/trainingConfig';
 import { LoadingState, EmptyState } from '@/components/common';
 import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

 interface TrainingCase {
   id: string;
   situation_summary: string;
   detected_violation_type: string | null;
   detected_legal_refs: any[];
   ai_confidence: number;
   ai_reasoning: string | null;
   validation_status: string;
   user_correction: string | null;
   correction_notes: string | null;
   email_id: string | null;
   incident_id: string | null;
   created_at: string;
 }

export default function IATraining() {
   const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correction, setCorrection] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedType, setSelectedType] = useState('');
   // Fetch pending cases
   const { data: cases = [], isLoading, refetch } = useQuery({
     queryKey: ['ia-training-cases'],
     queryFn: async () => {
       const { data, error } = await supabase
        .from('ai_situation_training')
        .select('*')
        .eq('validation_status', 'pending')
        .order('training_priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(50);

       if (error) throw error;
       return (data || []) as TrainingCase[];
     },
   });

  const currentCase = cases[currentIndex];

   // Mutation for validation
   const validateMutation = useMutation({
     mutationFn: async ({ 
       caseId, 
       status, 
       correction, 
       notes, 
       violationType 
     }: { 
       caseId: string; 
       status: 'validated' | 'corrected' | 'rejected';
       correction?: string;
       notes?: string;
       violationType?: string;
     }) => {
      const updateData: Record<string, any> = {
        validation_status: status,
        user_correction: status === 'corrected' ? correction : null,
        correction_notes: notes || null,
      };

       if (status === 'corrected' && violationType) {
         updateData.detected_violation_type = violationType;
      }

      const { error } = await supabase
        .from('ai_situation_training')
        .update(updateData)
         .eq('id', caseId);

      if (error) throw error;
       
       // Also record in ai_training_feedback for the feedback loop
       await supabase.from('ai_training_feedback').insert({
         entity_id: caseId,
         entity_type: 'situation_training',
         feedback_type: status === 'rejected' ? 'false_positive' : status,
         notes: notes || null,
         original_detection: null,
         user_correction: status === 'corrected' ? { type: violationType, notes } : null,
       });

       return { status };
     },
     onSuccess: (data) => {
      toast.success(
         data.status === 'validated' ? 'Analyse validée' :
         data.status === 'corrected' ? 'Correction enregistrée' :
        'Cas rejeté'
      );
       queryClient.invalidateQueries({ queryKey: ['ia-training-cases'] });
       queryClient.invalidateQueries({ queryKey: ['training-stats'] });
       
       // Reset form for next case
       if (currentIndex < cases.length - 1) {
         const nextCase = cases[currentIndex + 1];
         if (nextCase) {
           setCorrection(nextCase.user_correction || nextCase.detected_violation_type || '');
           setNotes(nextCase.correction_notes || '');
           setSelectedType(nextCase.detected_violation_type || '');
         }
      }
     },
     onError: (error: Error) => {
       toast.error('Erreur lors de la sauvegarde', {
         description: error.message,
       });
     },
   });
 
   const handleValidate = (status: 'validated' | 'corrected' | 'rejected') => {
     if (!currentCase) return;
     validateMutation.mutate({
       caseId: currentCase.id,
       status,
       correction: status === 'corrected' ? correction : undefined,
       notes,
       violationType: status === 'corrected' ? selectedType : undefined,
     });
   };

  const navigateCase = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(cases.length - 1, currentIndex + 1);
    
    setCurrentIndex(newIndex);
    const targetCase = cases[newIndex];
    if (targetCase) {
      setCorrection(targetCase.user_correction || targetCase.detected_violation_type || '');
      setNotes(targetCase.correction_notes || '');
      setSelectedType(targetCase.detected_violation_type || '');
    }
  };

   // Initialize form when case changes
   if (currentCase && correction === '' && selectedType === '') {
     setCorrection(currentCase.user_correction || currentCase.detected_violation_type || '');
     setSelectedType(currentCase.detected_violation_type || '');
     setNotes(currentCase.correction_notes || '');
   }
 
   if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 max-w-4xl">
          <PageHeader 
            title="Entraînement IA" 
            description="Validez et corrigez les analyses"
          />
           <LoadingState message="Chargement des cas..." />
        </div>
      </AppLayout>
    );
  }

  if (cases.length === 0) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 max-w-4xl">
          <PageHeader 
            title="Entraînement IA" 
            description="Validez et corrigez les analyses"
          />
           <div className="mb-4">
             <TrainingStats />
           </div>
           <EmptyState
             icon={CheckCircle}
             title="Tout est à jour !"
             description="Aucun cas en attente de validation. Les nouveaux cas apparaîtront après l'analyse des emails."
             actionLabel="Rafraîchir"
             onAction={() => refetch()}
           />
           <div className="flex gap-2 justify-center mt-4">
             <Button asChild>
               <Link to="/analysis-pipeline">Lancer le pipeline</Link>
             </Button>
           </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl">
        <PageHeader 
          title="Entraînement IA" 
          description={`Cas ${currentIndex + 1} sur ${cases.length} en attente`}
        />
         
         {/* Stats compactes */}
         <div className="mb-4">
           <TrainingStats compact />
         </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateCase('prev')}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Précédent
          </Button>
          <Badge variant="secondary">
            {currentIndex + 1} / {cases.length}
          </Badge>
           <Button
             variant="outline"
             size="sm"
             onClick={() => navigateCase('next')}
             disabled={currentIndex === cases.length - 1}
           >
            Suivant
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

         {/* Cas actuel avec TrainingCard réutilisable */}
         <TrainingCard
           id={currentCase.id}
           situationSummary={currentCase.situation_summary}
           violationType={currentCase.detected_violation_type}
           confidence={currentCase.ai_confidence}
           reasoning={currentCase.ai_reasoning}
           legalRefs={currentCase.detected_legal_refs}
           emailId={currentCase.email_id}
           createdAt={currentCase.created_at}
         />

        {/* Correction */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Votre évaluation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Type de violation (corrigé)</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type correct" />
                </SelectTrigger>
                <SelectContent>
                  {VIOLATION_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notes de correction (optionnel)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Expliquez votre correction pour améliorer l'IA..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
         <ValidationButtons
           onValidate={() => handleValidate('validated')}
           onCorrect={() => handleValidate('corrected')}
           onReject={() => handleValidate('rejected')}
           isLoading={validateMutation.isPending}
           correctDisabled={!selectedType}
           className="justify-end"
         />
      </div>
    </AppLayout>
  );
}
