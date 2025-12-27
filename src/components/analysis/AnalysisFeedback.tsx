import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { useAITrainingTracker } from '@/hooks/useAITrainingTracker';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AnalysisFeedbackProps {
  emailId: string;
  analysisData?: any;
  className?: string;
}

export function AnalysisFeedback({ emailId, analysisData, className }: AnalysisFeedbackProps) {
  const [submitted, setSubmitted] = useState<'useful' | 'not_useful' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { trackAnalysisFeedback } = useAITrainingTracker();

  const handleFeedback = async (isUseful: boolean) => {
    if (submitted) return;
    
    setIsSubmitting(true);
    try {
      const result = await trackAnalysisFeedback(emailId, isUseful, analysisData);
      if (result.success) {
        setSubmitted(isUseful ? 'useful' : 'not_useful');
        toast.success(isUseful ? 'Merci ! L\'IA apprend.' : 'Feedback enregistré');
      } else {
        toast.error('Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('Feedback error:', error);
      toast.error('Erreur');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        {submitted === 'useful' ? (
          <>
            <ThumbsUp className="h-4 w-4 text-green-500" />
            <span>Merci pour votre retour !</span>
          </>
        ) : (
          <>
            <ThumbsDown className="h-4 w-4 text-orange-500" />
            <span>Nous améliorerons cette analyse</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground">Cette analyse est-elle utile ?</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleFeedback(true)}
        disabled={isSubmitting}
        className="h-8 px-2 hover:bg-green-500/10 hover:text-green-600"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ThumbsUp className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleFeedback(false)}
        disabled={isSubmitting}
        className="h-8 px-2 hover:bg-orange-500/10 hover:text-orange-600"
      >
        <ThumbsDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
