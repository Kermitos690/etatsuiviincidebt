import { useState, useEffect, useCallback, createContext, useContext, ReactNode, forwardRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Play,
} from 'lucide-react';

// Types
export interface TutorialStep {
  id: string;
  route: string;
  target?: string; // CSS selector for element to highlight
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: string; // What the user should do
}

export interface TutorialPage {
  route: string;
  name: string;
  icon: string;
  steps: TutorialStep[];
}

// All tutorial pages with their steps
export const tutorialPages: TutorialPage[] = [
  {
    route: '/',
    name: 'Dashboard',
    icon: '📊',
    steps: [
      {
        id: 'dashboard-welcome',
        route: '/',
        title: 'Bienvenue sur le Dashboard',
        description: 'Voici votre tableau de bord principal. Il affiche une vue d\'ensemble de tous vos incidents, emails et alertes.',
        position: 'center',
      },
      {
        id: 'dashboard-kpis',
        route: '/',
        target: '[data-tutorial="dashboard-kpis"]',
        title: 'Indicateurs clés (KPIs)',
        description: 'Ces cartes affichent les statistiques importantes : nombre d\'incidents, emails analysés, score moyen de gravité.',
        position: 'bottom',
        action: 'Observez les chiffres pour comprendre l\'état de votre dossier',
      },
      {
        id: 'dashboard-charts',
        route: '/',
        target: '[data-tutorial="dashboard-charts"]',
        title: 'Graphiques d\'évolution',
        description: 'Les graphiques montrent l\'évolution dans le temps de vos incidents et violations.',
        position: 'top',
      },
      {
        id: 'dashboard-actions',
        route: '/',
        target: '[data-tutorial="quick-actions"]',
        title: 'Actions rapides',
        description: 'Accédez rapidement aux fonctionnalités principales depuis ces boutons.',
        position: 'left',
      },
    ],
  },
  {
    route: '/gmail-config',
    name: 'Configuration Gmail',
    icon: '⚙️',
    steps: [
      {
        id: 'gmail-intro',
        route: '/gmail-config',
        title: 'Configuration Gmail',
        description: 'Connectez votre compte Gmail pour synchroniser automatiquement vos emails liés à la curatelle.',
        position: 'center',
      },
      {
        id: 'gmail-connect',
        route: '/gmail-config',
        target: '[data-tutorial="gmail-connect"]',
        title: 'Connexion OAuth',
        description: 'Cliquez sur "Connecter Gmail" pour autoriser l\'application à lire vos emails de manière sécurisée.',
        position: 'bottom',
        action: 'Cliquez sur le bouton pour démarrer la connexion',
      },
      {
        id: 'gmail-filters',
        route: '/gmail-config',
        target: '[data-tutorial="gmail-filters"]',
        title: 'Filtres de synchronisation',
        description: 'Définissez les domaines (ex: vd.ch, ch.ch) et mots-clés pour filtrer les emails pertinents.',
        position: 'bottom',
      },
    ],
  },
  {
    route: '/emails',
    name: 'Boîte de réception',
    icon: '📥',
    steps: [
      {
        id: 'emails-intro',
        route: '/emails',
        title: 'Vos Emails Synchronisés',
        description: 'Cette page affiche tous les emails synchronisés depuis Gmail, filtrés selon vos critères.',
        position: 'center',
      },
      {
        id: 'emails-filters',
        route: '/emails',
        target: '[data-tutorial="email-filters"]',
        title: 'Filtres et recherche',
        description: 'Utilisez les filtres pour trouver rapidement des emails par expéditeur, sujet ou statut d\'analyse.',
        position: 'bottom',
      },
      {
        id: 'emails-actions',
        route: '/emails',
        target: '[data-tutorial="email-actions"]',
        title: 'Actions sur les emails',
        description: 'Pour chaque email, vous pouvez : analyser avec l\'IA, créer un incident, ou le supprimer.',
        position: 'left',
        action: 'Cliquez sur un email pour voir les actions disponibles',
      },
    ],
  },
  {
    route: '/analysis-pipeline',
    name: 'Pipeline d\'Analyse',
    icon: '🧠',
    steps: [
      {
        id: 'pipeline-intro',
        route: '/analysis-pipeline',
        title: 'Pipeline d\'Analyse IA',
        description: 'Le pipeline analyse vos emails en 5 passes successives pour extraire toutes les informations importantes.',
        position: 'center',
      },
      {
        id: 'pipeline-steps',
        route: '/analysis-pipeline',
        target: '[data-tutorial="pipeline-steps"]',
        title: 'Les 5 passes d\'analyse',
        description: '1) Resync emails, 2) Pièces jointes, 3) Extraction de faits, 4) Analyse de threads, 5) Corroboration.',
        position: 'bottom',
      },
      {
        id: 'pipeline-launch',
        route: '/analysis-pipeline',
        target: '[data-tutorial="pipeline-launch"]',
        title: 'Lancer l\'analyse',
        description: 'Cliquez sur "Lancer l\'analyse" pour démarrer le processus complet. Suivez la progression en temps réel.',
        position: 'bottom',
        action: 'Cliquez pour lancer votre première analyse',
      },
    ],
  },
  {
    route: '/incidents',
    name: 'Incidents',
    icon: '🚨',
    steps: [
      {
        id: 'incidents-intro',
        route: '/incidents',
        title: 'Gestion des Incidents',
        description: 'Cette page centralise tous les incidents documentés. Chaque incident représente un dysfonctionnement identifié.',
        position: 'center',
      },
      {
        id: 'incidents-filters',
        route: '/incidents',
        target: '[data-tutorial="incident-filters"]',
        title: 'Filtrer les incidents',
        description: 'Filtrez par institution, statut, gravité ou utilisez la recherche textuelle.',
        position: 'bottom',
      },
      {
        id: 'incidents-create',
        route: '/incidents',
        target: '[data-tutorial="incident-create"]',
        title: 'Créer un incident',
        description: 'Cliquez sur "+ Nouvel incident" pour documenter un nouveau dysfonctionnement.',
        position: 'left',
        action: 'Créez votre premier incident',
      },
      {
        id: 'incidents-export',
        route: '/incidents',
        target: '[data-tutorial="incident-export"]',
        title: 'Exporter',
        description: 'Exportez vos incidents en CSV ou générez des PDF juridiques pour le Juge de Paix.',
        position: 'left',
      },
    ],
  },
  {
    route: '/control-center',
    name: 'Centre de Contrôle',
    icon: '🎛️',
    steps: [
      {
        id: 'control-intro',
        route: '/control-center',
        title: 'Centre de Contrôle',
        description: 'Vue centralisée en temps réel de toutes les alertes, incidents et analyses IA.',
        position: 'center',
      },
      {
        id: 'control-realtime',
        route: '/control-center',
        target: '[data-tutorial="realtime-alerts"]',
        title: 'Alertes en temps réel',
        description: 'Les alertes critiques apparaissent ici. Réagissez rapidement aux problèmes urgents.',
        position: 'bottom',
      },
    ],
  },
  {
    route: '/violations',
    name: 'Violations',
    icon: '⚖️',
    steps: [
      {
        id: 'violations-intro',
        route: '/violations',
        title: 'Dashboard des Violations',
        description: 'Visualisez toutes les violations légales détectées, classées par type et gravité.',
        position: 'center',
      },
      {
        id: 'violations-types',
        route: '/violations',
        target: '[data-tutorial="violation-types"]',
        title: 'Types de violations',
        description: 'Chaque couleur représente un type : consentement, délais, documents, etc.',
        position: 'bottom',
      },
    ],
  },
  {
    route: '/pdf-documents',
    name: 'Documents PDF',
    icon: '📄',
    steps: [
      {
        id: 'pdf-intro',
        route: '/pdf-documents',
        title: 'Gestion des Documents',
        description: 'Organisez vos documents PDF par situations (dossiers thématiques).',
        position: 'center',
      },
      {
        id: 'pdf-upload',
        route: '/pdf-documents',
        target: '[data-tutorial="pdf-upload"]',
        title: 'Importer des PDFs',
        description: 'Glissez-déposez vos documents ou cliquez pour les uploader.',
        position: 'bottom',
        action: 'Importez votre premier document',
      },
      {
        id: 'pdf-analyze',
        route: '/pdf-documents',
        target: '[data-tutorial="pdf-analyze"]',
        title: 'Analyser une situation',
        description: 'L\'IA analyse tous les documents d\'une situation pour générer un résumé complet.',
        position: 'left',
      },
    ],
  },
  {
    route: '/exports',
    name: 'Exports',
    icon: '📤',
    steps: [
      {
        id: 'exports-intro',
        route: '/exports',
        title: 'Centre d\'Exports',
        description: 'Générez tous types de rapports : PDF juridiques, dossiers complets, rapports hebdomadaires.',
        position: 'center',
      },
      {
        id: 'exports-types',
        route: '/exports',
        target: '[data-tutorial="export-types"]',
        title: 'Types d\'exports',
        description: 'Choisissez le format adapté : PDF premium avec bases légales, dossier juridique, timeline...',
        position: 'bottom',
        action: 'Générez votre premier rapport',
      },
    ],
  },
  {
    route: '/ia-training',
    name: 'Entraînement IA',
    icon: '🎓',
    steps: [
      {
        id: 'training-intro',
        route: '/ia-training',
        title: 'Entraînement de l\'IA',
        description: 'Validez ou corrigez les analyses de l\'IA pour améliorer sa précision.',
        position: 'center',
      },
      {
        id: 'training-feedback',
        route: '/ia-training',
        target: '[data-tutorial="training-feedback"]',
        title: 'Donner du feedback',
        description: 'Marquez les analyses comme "Correct", "Partiel", "Faux positif" ou "Manqué".',
        position: 'bottom',
        action: 'Validez votre première analyse',
      },
    ],
  },
];

// Storage key for tutorial progress
const TUTORIAL_STORAGE_KEY = 'guided-tutorial-progress';
const TUTORIAL_COMPLETED_KEY = 'guided-tutorial-completed';
const NEW_USER_KEY = 'is-new-user';

interface TutorialProgress {
  completedSteps: string[];
  currentPage: string;
  currentStepIndex: number;
  startedAt: string;
}

interface TutorialContextType {
  isActive: boolean;
  currentStep: TutorialStep | null;
  currentPageSteps: TutorialStep[];
  currentStepIndex: number;
  totalSteps: number;
  progress: number;
  startTutorial: () => void;
  stopTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipToPage: (route: string) => void;
  resetTutorial: () => void;
  isCompleted: boolean;
  completedSteps: string[];
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
}

interface TutorialProviderProps {
  children: ReactNode;
}

export function TutorialProvider({ children }: TutorialProviderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  // Get steps for current page
  const currentPageData = tutorialPages.find(p => p.route === location.pathname);
  const currentPageSteps = currentPageData?.steps || [];
  const currentStep = currentPageSteps[currentStepIndex] || null;

  // Calculate total progress
  const allSteps = tutorialPages.flatMap(p => p.steps);
  const totalSteps = allSteps.length;
  const progress = (completedSteps.length / totalSteps) * 100;

  // Load saved progress
  useEffect(() => {
    const savedProgress = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    const isNewUser = !localStorage.getItem(NEW_USER_KEY);
    const tutorialCompleted = localStorage.getItem(TUTORIAL_COMPLETED_KEY);
    
    if (tutorialCompleted) {
      setIsCompleted(true);
    }
    
    if (savedProgress) {
      const parsed: TutorialProgress = JSON.parse(savedProgress);
      setCompletedSteps(parsed.completedSteps);
    }
    
    // Auto-start tutorial for new users
    if (isNewUser && !tutorialCompleted) {
      localStorage.setItem(NEW_USER_KEY, 'true');
      setTimeout(() => {
        setIsActive(true);
      }, 1000);
    }
  }, []);

  // Save progress
  useEffect(() => {
    if (completedSteps.length > 0) {
      const progress: TutorialProgress = {
        completedSteps,
        currentPage: location.pathname,
        currentStepIndex,
        startedAt: new Date().toISOString(),
      };
      localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(progress));
    }
  }, [completedSteps, location.pathname, currentStepIndex]);

  // Reset step index when page changes
  useEffect(() => {
    if (isActive) {
      setCurrentStepIndex(0);
    }
  }, [location.pathname, isActive]);

  const startTutorial = useCallback(() => {
    setIsActive(true);
    setCurrentStepIndex(0);
  }, []);

  const stopTutorial = useCallback(() => {
    setIsActive(false);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep) {
      setCompletedSteps(prev => 
        prev.includes(currentStep.id) ? prev : [...prev, currentStep.id]
      );
    }

    if (currentStepIndex < currentPageSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Find next page with steps
      const currentPageIndex = tutorialPages.findIndex(p => p.route === location.pathname);
      const nextPage = tutorialPages[currentPageIndex + 1];
      
      if (nextPage) {
        navigate(nextPage.route);
        setCurrentStepIndex(0);
      } else {
        // Tutorial complete
        setIsActive(false);
        setIsCompleted(true);
        localStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
      }
    }
  }, [currentStep, currentStepIndex, currentPageSteps.length, location.pathname, navigate]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    } else {
      // Go to previous page
      const currentPageIndex = tutorialPages.findIndex(p => p.route === location.pathname);
      const prevPage = tutorialPages[currentPageIndex - 1];
      
      if (prevPage) {
        navigate(prevPage.route);
        setCurrentStepIndex(prevPage.steps.length - 1);
      }
    }
  }, [currentStepIndex, location.pathname, navigate]);

  const skipToPage = useCallback((route: string) => {
    navigate(route);
    setCurrentStepIndex(0);
  }, [navigate]);

  const resetTutorial = useCallback(() => {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    localStorage.removeItem(TUTORIAL_COMPLETED_KEY);
    setCompletedSteps([]);
    setIsCompleted(false);
    setCurrentStepIndex(0);
    navigate('/');
    setTimeout(() => setIsActive(true), 500);
  }, [navigate]);

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        currentStep,
        currentPageSteps,
        currentStepIndex,
        totalSteps,
        progress,
        startTutorial,
        stopTutorial,
        nextStep,
        prevStep,
        skipToPage,
        resetTutorial,
        isCompleted,
        completedSteps,
      }}
    >
      {children}
      {isActive && <TutorialOverlay />}
    </TutorialContext.Provider>
  );
}

// Tutorial Overlay Component
function TutorialOverlay() {
  const {
    currentStep,
    currentStepIndex,
    currentPageSteps,
    progress,
    nextStep,
    prevStep,
    stopTutorial,
    completedSteps,
    totalSteps,
  } = useTutorial();
  
  const location = useLocation();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const currentPageData = tutorialPages.find(p => p.route === location.pathname);

  // Find and highlight target element
  useEffect(() => {
    if (currentStep?.target) {
      const element = document.querySelector(currentStep.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  const handleNext = () => {
    setIsAnimating(true);
    setTimeout(() => {
      nextStep();
      setIsAnimating(false);
    }, 150);
  };

  const handlePrev = () => {
    setIsAnimating(true);
    setTimeout(() => {
      prevStep();
      setIsAnimating(false);
    }, 150);
  };

  if (!currentStep) {
    return null;
  }

  const isFirstStep = currentStepIndex === 0 && tutorialPages[0]?.route === location.pathname;
  const isLastPageStep = currentStepIndex === currentPageSteps.length - 1;
  const isLastPage = tutorialPages[tutorialPages.length - 1]?.route === location.pathname;
  const isVeryLastStep = isLastPageStep && isLastPage;

  // Calculate tooltip position
  const getTooltipStyle = () => {
    if (!targetRect || currentStep.position === 'center') {
      return {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 16;
    const tooltipWidth = 400;
    const tooltipHeight = 250;

    switch (currentStep.position) {
      case 'bottom':
        return {
          position: 'fixed' as const,
          top: `${targetRect.bottom + padding}px`,
          left: `${Math.max(padding, Math.min(targetRect.left, window.innerWidth - tooltipWidth - padding))}px`,
        };
      case 'top':
        return {
          position: 'fixed' as const,
          top: `${targetRect.top - tooltipHeight - padding}px`,
          left: `${Math.max(padding, Math.min(targetRect.left, window.innerWidth - tooltipWidth - padding))}px`,
        };
      case 'left':
        return {
          position: 'fixed' as const,
          top: `${targetRect.top}px`,
          left: `${targetRect.left - tooltipWidth - padding}px`,
        };
      case 'right':
        return {
          position: 'fixed' as const,
          top: `${targetRect.top}px`,
          left: `${targetRect.right + padding}px`,
        };
      default:
        return {
          position: 'fixed' as const,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  };

  return (
    <>
      {/* Overlay backdrop */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        {/* Dark overlay with cutout for target */}
        <div 
          className="absolute inset-0 bg-black/60 transition-all duration-300"
          style={targetRect ? {
            clipPath: `polygon(
              0% 0%, 
              0% 100%, 
              ${targetRect.left - 8}px 100%, 
              ${targetRect.left - 8}px ${targetRect.top - 8}px, 
              ${targetRect.right + 8}px ${targetRect.top - 8}px, 
              ${targetRect.right + 8}px ${targetRect.bottom + 8}px, 
              ${targetRect.left - 8}px ${targetRect.bottom + 8}px, 
              ${targetRect.left - 8}px 100%, 
              100% 100%, 
              100% 0%
            )`,
          } : {}}
        />
        
        {/* Highlight ring around target */}
        {targetRect && (
          <div
            className="absolute border-2 border-primary rounded-lg animate-pulse pointer-events-none"
            style={{
              top: `${targetRect.top - 8}px`,
              left: `${targetRect.left - 8}px`,
              width: `${targetRect.width + 16}px`,
              height: `${targetRect.height + 16}px`,
              boxShadow: '0 0 0 4px rgba(var(--primary), 0.3)',
            }}
          />
        )}
      </div>

      {/* Tooltip card */}
      <Card
        className={cn(
          "z-[9999] w-[400px] max-w-[calc(100vw-32px)] shadow-2xl border-primary/50 pointer-events-auto",
          "transition-all duration-300",
          isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
        )}
        style={getTooltipStyle()}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="gap-1">
              <GraduationCap className="w-3 h-3" />
              {currentPageData?.icon} {currentPageData?.name}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={stopTutorial}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardTitle className="text-lg">{currentStep.title}</CardTitle>
          <CardDescription>{currentStep.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Action hint */}
          {currentStep.action && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium">{currentStep.action}</span>
            </div>
          )}

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progression globale</span>
              <span>{completedSteps.length}/{totalSteps} étapes</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          {/* Step indicators */}
          <div className="flex justify-center gap-1.5">
            {currentPageSteps.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  idx === currentStepIndex
                    ? "w-6 bg-primary"
                    : idx < currentStepIndex
                      ? "w-1.5 bg-primary/60"
                      : "w-1.5 bg-muted"
                )}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={isFirstStep}
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Précédent
            </Button>
            <Button
              size="sm"
              onClick={handleNext}
              className="flex-1"
            >
              {isVeryLastStep ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Terminer
                </>
              ) : (
                <>
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Tutorial Start Button Component
export function TutorialStartButton() {
  const { startTutorial, isActive, isCompleted, resetTutorial, progress } = useTutorial();

  if (isActive) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={isCompleted ? resetTutorial : startTutorial}
      className="gap-2"
    >
      {isCompleted ? (
        <>
          <RotateCcw className="w-4 h-4" />
          Refaire le tutoriel
        </>
      ) : progress > 0 ? (
        <>
          <Play className="w-4 h-4" />
          Continuer ({Math.round(progress)}%)
        </>
      ) : (
        <>
          <GraduationCap className="w-4 h-4" />
          Tutoriel guidé
        </>
      )}
    </Button>
  );
}

// Welcome Modal for New Users - wrapped in forwardRef to prevent React warnings
export const WelcomeTutorialModal = forwardRef<HTMLDivElement>(function WelcomeTutorialModal(_, ref) {
  const { isActive, startTutorial, isCompleted } = useTutorial();
  const [showWelcome, setShowWelcome] = useState(false);
  
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('tutorial-welcome-seen');
    const isNewUser = !localStorage.getItem(NEW_USER_KEY);
    
    if (!hasSeenWelcome && isNewUser && !isCompleted) {
      setTimeout(() => setShowWelcome(true), 1500);
    }
  }, [isCompleted]);

  const handleStart = () => {
    localStorage.setItem('tutorial-welcome-seen', 'true');
    setShowWelcome(false);
    startTutorial();
  };

  const handleSkip = () => {
    localStorage.setItem('tutorial-welcome-seen', 'true');
    localStorage.setItem(NEW_USER_KEY, 'true');
    setShowWelcome(false);
  };

  if (!showWelcome || isActive) return null;

  return (
    <div ref={ref} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70">
      <Card className="w-[500px] max-w-[calc(100vw-32px)] shadow-2xl border-primary/50 animate-scale-in">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary animate-pulse" />
            </div>
          </div>
          <CardTitle className="text-2xl">Bienvenue sur Registre Vigilance !</CardTitle>
          <CardDescription className="text-base">
            Votre système de suivi et d'analyse juridique pour la protection des personnes sous curatelle
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span>1</span>
              </div>
              <div>
                <p className="font-medium">Configurez Gmail</p>
                <p className="text-sm text-muted-foreground">Synchronisez vos emails automatiquement</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span>2</span>
              </div>
              <div>
                <p className="font-medium">Analysez avec l'IA</p>
                <p className="text-sm text-muted-foreground">Détectez automatiquement les violations</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span>3</span>
              </div>
              <div>
                <p className="font-medium">Documentez les incidents</p>
                <p className="text-sm text-muted-foreground">Exportez des rapports juridiques</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSkip} className="flex-1">
              Passer
            </Button>
            <Button onClick={handleStart} className="flex-1 gap-2">
              <GraduationCap className="w-4 h-4" />
              Démarrer le tutoriel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
WelcomeTutorialModal.displayName = 'WelcomeTutorialModal';
