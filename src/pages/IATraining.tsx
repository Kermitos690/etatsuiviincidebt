import { useState, useEffect } from 'react';
import { Brain, CheckCircle, XCircle, AlertTriangle, Loader2, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

const VIOLATION_TYPES = [
  'Abus de droit',
  'Retard injustifié',
  'Défaut d\'information',
  'Non-respect des délais',
  'Manquement au devoir de protection',
  'Violation du droit d\'être entendu',
  'Discrimination',
  'Autre',
  'Non applicable',
];

export default function IATraining() {
  const [cases, setCases] = useState<TrainingCase[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [correction, setCorrection] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedType, setSelectedType] = useState('');

  useEffect(() => {
    fetchPendingCases();
  }, []);

  const fetchPendingCases = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_situation_training')
        .select('*')
        .eq('validation_status', 'pending')
        .order('training_priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      setCases((data || []) as TrainingCase[]);
      
      if (data && data.length > 0) {
        const first = data[0] as TrainingCase;
        setCorrection(first.user_correction || first.detected_violation_type || '');
        setNotes(first.correction_notes || '');
        setSelectedType(first.detected_violation_type || '');
      }
    } catch (err) {
      console.error('Error fetching cases:', err);
      toast.error('Erreur lors du chargement des cas');
    } finally {
      setLoading(false);
    }
  };

  const currentCase = cases[currentIndex];

  const handleValidate = async (status: 'validated' | 'corrected' | 'rejected') => {
    if (!currentCase) return;
    setSaving(true);

    try {
      const updateData: Record<string, any> = {
        validation_status: status,
        user_correction: status === 'corrected' ? correction : null,
        correction_notes: notes || null,
      };

      if (status === 'corrected' && selectedType) {
        updateData.detected_violation_type = selectedType;
      }

      const { error } = await supabase
        .from('ai_situation_training')
        .update(updateData)
        .eq('id', currentCase.id);

      if (error) throw error;

      toast.success(
        status === 'validated' ? 'Analyse validée' :
        status === 'corrected' ? 'Correction enregistrée' :
        'Cas rejeté'
      );

      // Passer au suivant
      const newCases = cases.filter((_, i) => i !== currentIndex);
      setCases(newCases);
      
      if (newCases.length > 0) {
        const nextIndex = Math.min(currentIndex, newCases.length - 1);
        setCurrentIndex(nextIndex);
        const nextCase = newCases[nextIndex];
        setCorrection(nextCase.user_correction || nextCase.detected_violation_type || '');
        setNotes(nextCase.correction_notes || '');
        setSelectedType(nextCase.detected_violation_type || '');
      }
    } catch (err) {
      console.error('Error saving:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
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

  if (loading) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 max-w-4xl">
          <PageHeader 
            title="Entraînement IA" 
            description="Validez et corrigez les analyses"
          />
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
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
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="font-medium text-lg mb-2">Tout est à jour !</h3>
              <p className="text-muted-foreground">
                Aucun cas en attente de validation.
              </p>
              <Button variant="outline" className="mt-4" onClick={fetchPendingCases}>
                Rafraîchir
              </Button>
            </CardContent>
          </Card>
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

        {/* Cas actuel */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Situation analysée
              </CardTitle>
              <div className="text-xs text-muted-foreground">
                {format(new Date(currentCase.created_at), 'd MMM yyyy', { locale: fr })}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="text-sm whitespace-pre-wrap">{currentCase.situation_summary}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Type détecté</p>
                <Badge variant="outline">
                  {currentCase.detected_violation_type || 'Non déterminé'}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Confiance IA</p>
                <Badge 
                  variant={currentCase.ai_confidence > 0.7 ? 'default' : 'secondary'}
                >
                  {Math.round(currentCase.ai_confidence * 100)}%
                </Badge>
              </div>
            </div>

            {currentCase.ai_reasoning && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Raisonnement IA</p>
                <p className="text-sm text-muted-foreground italic">
                  {currentCase.ai_reasoning}
                </p>
              </div>
            )}

            {currentCase.detected_legal_refs && currentCase.detected_legal_refs.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Références légales détectées</p>
                <div className="flex flex-wrap gap-1">
                  {currentCase.detected_legal_refs.map((ref: any, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {typeof ref === 'string' ? ref : ref.article || ref.code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => handleValidate('rejected')}
            disabled={saving}
            className="text-destructive border-destructive hover:bg-destructive/10"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Rejeter (faux positif)
          </Button>
          <Button
            variant="outline"
            onClick={() => handleValidate('corrected')}
            disabled={saving || !selectedType}
          >
            <Save className="h-4 w-4 mr-2" />
            Corriger
          </Button>
          <Button
            onClick={() => handleValidate('validated')}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Valider l'analyse
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
