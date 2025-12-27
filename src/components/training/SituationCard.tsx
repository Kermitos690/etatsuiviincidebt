import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Scale,
  Mail,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface LegalRef {
  code: string;
  article: string;
  text?: string;
  confidence: number;
  reasoning?: string;
}

interface SituationCardProps {
  situation: {
    id: string;
    situation_summary: string;
    detected_violation_type: string;
    detected_legal_refs: LegalRef[];
    ai_confidence: number;
    ai_reasoning: string;
    emails?: {
      subject: string;
      sender: string;
      received_at: string;
      body?: string;
    };
  };
  onValidate: (
    id: string,
    status: 'correct' | 'incorrect' | 'needs_verification' | 'partially_correct',
    correction?: string,
    correctRefs?: LegalRef[],
    notes?: string
  ) => void;
}

export function SituationCard({ situation, onValidate }: SituationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correction, setCorrection] = useState('');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [editedRefs, setEditedRefs] = useState<LegalRef[]>(situation.detected_legal_refs || []);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const handleQuickValidate = (status: 'correct' | 'incorrect' | 'needs_verification') => {
    if (status === 'correct') {
      onValidate(situation.id, status);
    } else if (status === 'incorrect') {
      setShowCorrection(true);
    } else {
      onValidate(situation.id, status);
    }
  };

  const handleSubmitCorrection = () => {
    onValidate(
      situation.id, 
      'incorrect', 
      correction, 
      editedRefs, 
      correctionNotes
    );
    setShowCorrection(false);
  };

  const handlePartiallyCorrect = () => {
    onValidate(
      situation.id,
      'partially_correct',
      correction,
      editedRefs,
      correctionNotes
    );
    setShowCorrection(false);
  };

  const updateLegalRef = (index: number, field: keyof LegalRef, value: string | number) => {
    setEditedRefs(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addLegalRef = () => {
    setEditedRefs(prev => [...prev, { code: '', article: '', confidence: 1.0 }]);
  };

  const removeLegalRef = (index: number) => {
    setEditedRefs(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getConfidenceColor(situation.ai_confidence)}>
                <Sparkles className="h-3 w-3 mr-1" />
                {Math.round(situation.ai_confidence * 100)}% confiance
              </Badge>
              <Badge variant="secondary">
                {situation.detected_violation_type}
              </Badge>
            </div>
            <CardTitle className="text-base font-medium mt-2">
              {situation.situation_summary}
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Email source */}
        {situation.emails && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
            <Mail className="h-4 w-4" />
            <span className="font-medium">{situation.emails.subject}</span>
            <span>•</span>
            <span>{situation.emails.sender}</span>
            <span>•</span>
            <span>{format(new Date(situation.emails.received_at), 'dd MMM yyyy', { locale: fr })}</span>
          </div>
        )}

        {/* Legal references */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Scale className="h-4 w-4" />
            Références légales détectées
          </div>
          <div className="flex flex-wrap gap-2">
            {(situation.detected_legal_refs || []).map((ref, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {ref.code} - {ref.article}
                <span className="ml-1 opacity-60">({Math.round(ref.confidence * 100)}%)</span>
              </Badge>
            ))}
            {(!situation.detected_legal_refs || situation.detected_legal_refs.length === 0) && (
              <span className="text-sm text-muted-foreground">Aucune référence détectée</span>
            )}
          </div>
        </div>

        {/* AI Reasoning */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span>Raisonnement de l'IA</span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded mt-2">
              {situation.ai_reasoning}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Quick validation buttons */}
        {!showCorrection && (
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={() => handleQuickValidate('correct')}
              variant="outline" 
              className="flex-1 border-green-500 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Correct (garder)
            </Button>
            <Button 
              onClick={() => handleQuickValidate('needs_verification')}
              variant="outline" 
              className="flex-1 border-yellow-500 text-yellow-700 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-950"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              À vérifier
            </Button>
            <Button 
              onClick={() => handleQuickValidate('incorrect')}
              variant="outline" 
              className="flex-1 border-red-500 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Hors sujet (supprimer)
            </Button>
          </div>
        )}

        {/* Correction form */}
        {showCorrection && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Correction requise
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Correction de la situation</label>
              <Textarea
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                placeholder="Décrivez la situation correcte..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Références légales correctes</label>
              <ScrollArea className="max-h-48">
                <div className="space-y-2">
                  {editedRefs.map((ref, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={ref.code}
                        onChange={(e) => updateLegalRef(idx, 'code', e.target.value)}
                        placeholder="Code (ex: Code Civil)"
                        className="flex-1 px-2 py-1 text-sm border rounded"
                      />
                      <input
                        type="text"
                        value={ref.article}
                        onChange={(e) => updateLegalRef(idx, 'article', e.target.value)}
                        placeholder="Article (ex: 1240)"
                        className="w-32 px-2 py-1 text-sm border rounded"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLegalRef(idx)}
                        className="text-destructive"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Button variant="outline" size="sm" onClick={addLegalRef}>
                + Ajouter une référence
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes additionnelles</label>
              <Textarea
                value={correctionNotes}
                onChange={(e) => setCorrectionNotes(e.target.value)}
                placeholder="Explications, contexte..."
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handlePartiallyCorrect} variant="outline" className="flex-1">
                Partiellement correct
              </Button>
              <Button onClick={handleSubmitCorrection} variant="destructive" className="flex-1">
                Soumettre la correction
              </Button>
              <Button onClick={() => setShowCorrection(false)} variant="ghost">
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
