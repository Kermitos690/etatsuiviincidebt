import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  ArrowLeft, 
  ArrowUp, 
  ArrowDown, 
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Hand
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeTutorialProps {
  open: boolean;
  onComplete: () => void;
}

const TUTORIAL_KEY = 'swipe-training-tutorial-completed';

const steps = [
  {
    icon: GraduationCap,
    title: 'Bienvenue dans le mode Swipe Training !',
    description: 'Aidez l\'IA à apprendre en validant les connexions entre emails. C\'est comme Tinder, mais pour l\'analyse de correspondances !',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: ArrowRight,
    title: 'Swipe → Droite = Corroboration',
    description: 'Si les deux emails sont liés au même sujet ou problème, swipez vers la droite pour confirmer la corroboration.',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    animation: 'animate-bounce-x-right',
  },
  {
    icon: ArrowLeft,
    title: 'Swipe ← Gauche = Pas de lien',
    description: 'Si les emails ne sont pas liés, swipez vers la gauche. L\'IA apprendra à ne plus les associer.',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    animation: 'animate-bounce-x-left',
  },
  {
    icon: ArrowUp,
    title: 'Swipe ↑ Haut = Analyse IA',
    description: 'Besoin d\'aide ? Swipez vers le haut pour demander une analyse approfondie par l\'IA.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    animation: 'animate-bounce-y-up',
  },
  {
    icon: ArrowDown,
    title: 'Swipe ↓ Bas = Non pertinent',
    description: 'Si un email est du spam ou non pertinent pour l\'audit, swipez vers le bas pour le marquer.',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    animation: 'animate-bounce-y-down',
  },
  {
    icon: Sparkles,
    title: 'Gagnez des badges !',
    description: 'Plus vous validez de paires, plus vous gagnez de points et débloquez des badges. Votre contribution améliore l\'IA !',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
];

export function SwipeTutorial({ open, onComplete }: SwipeTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      localStorage.setItem(TUTORIAL_KEY, 'true');
      onComplete();
    } else {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(TUTORIAL_KEY, 'true');
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Tutoriel Swipe Training
          </DialogTitle>
          <DialogDescription>
            Étape {currentStep + 1} sur {steps.length}
          </DialogDescription>
        </DialogHeader>

        <div className={cn(
          "py-8 transition-all duration-300",
          isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
        )}>
          {/* Icon with animation */}
          <div className="flex justify-center mb-6">
            <div className={cn(
              "w-24 h-24 rounded-3xl flex items-center justify-center transition-all duration-500",
              step.bgColor,
              step.animation
            )}>
              <step.icon className={cn("h-12 w-12", step.color)} />
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-3 px-4">
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Hand gesture hint */}
          {step.animation && (
            <div className="flex justify-center mt-6">
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-full">
                <Hand className="h-4 w-4" />
                <span>Glissez ou utilisez les flèches du clavier</span>
              </div>
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                index === currentStep 
                  ? "bg-primary w-6" 
                  : index < currentStep 
                    ? "bg-primary/60" 
                    : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {!isLastStep && (
            <Button variant="ghost" onClick={handleSkip} className="flex-1">
              Passer
            </Button>
          )}
          <Button onClick={handleNext} className="flex-1 gap-2">
            {isLastStep ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                C'est parti !
              </>
            ) : (
              'Suivant'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useTutorialState() {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(TUTORIAL_KEY);
    if (!completed) {
      // Delay to let the page load first
      setTimeout(() => setShowTutorial(true), 500);
    }
  }, []);

  const completeTutorial = () => {
    setShowTutorial(false);
  };

  const resetTutorial = () => {
    localStorage.removeItem(TUTORIAL_KEY);
    setShowTutorial(true);
  };

  return { showTutorial, completeTutorial, resetTutorial };
}
