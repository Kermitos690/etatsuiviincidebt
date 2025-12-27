import { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  SkipForward, 
  Camera, 
  Loader2, 
  CheckCircle,
  RotateCcw,
  Upload,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";

interface TourStep {
  id: string;
  name: string;
  route: string;
  filename: string;
  description: string;
  captureDelay: number; // ms to wait before capturing
}

const tourSteps: TourStep[] = [
  { id: "dashboard", name: "Dashboard", route: "/", filename: "dashboard.png", description: "Tableau de bord principal", captureDelay: 2000 },
  { id: "gmail-config", name: "Configuration Gmail", route: "/gmail-config", filename: "gmail-config.png", description: "Configuration de la synchronisation Gmail", captureDelay: 2000 },
  { id: "email-sync", name: "Boîte de réception", route: "/emails", filename: "email-sync.png", description: "Liste des emails synchronisés", captureDelay: 2000 },
  { id: "analysis-pipeline", name: "Pipeline d'Analyse", route: "/analysis-pipeline", filename: "analysis-pipeline.png", description: "Pipeline d'analyse IA", captureDelay: 2000 },
  { id: "emails-analyzed", name: "Emails Analysés", route: "/emails-analyzed", filename: "emails-analyzed.png", description: "Résultats d'analyse des emails", captureDelay: 2000 },
  { id: "incidents", name: "Incidents", route: "/incidents", filename: "incidents.png", description: "Liste des incidents détectés", captureDelay: 2000 },
  { id: "attachments", name: "Pièces Jointes", route: "/attachments", filename: "attachments.png", description: "Gestionnaire de pièces jointes", captureDelay: 2000 },
  { id: "violations", name: "Violations", route: "/violations", filename: "violations.png", description: "Dashboard des violations", captureDelay: 2000 },
  { id: "exports", name: "Exports", route: "/exports", filename: "exports.png", description: "Page d'exportation PDF", captureDelay: 2000 },
  { id: "ia-auditor", name: "IA Auditeur", route: "/ia-auditeur", filename: "ia-auditor.png", description: "Interface IA Auditeur", captureDelay: 2000 },
  { id: "ia-training", name: "Entrainement IA", route: "/ia-training", filename: "ia-training.png", description: "Page d'entraînement de l'IA", captureDelay: 2000 },
];

interface CapturedScreenshot {
  id: string;
  filename: string;
  url?: string;
  captured: boolean;
  uploading: boolean;
}

export function TutorialTour() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [screenshots, setScreenshots] = useState<CapturedScreenshot[]>(
    tourSteps.map(step => ({
      id: step.id,
      filename: step.filename,
      captured: false,
      uploading: false,
    }))
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const [existingScreenshots, setExistingScreenshots] = useState<string[]>([]);

  // Fetch existing screenshots from Supabase Storage
  useEffect(() => {
    const fetchExistingScreenshots = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('tutorial-screenshots')
          .list('', { limit: 100 });

        if (error) throw error;
        
        const existingFiles = data?.map(file => file.name) || [];
        setExistingScreenshots(existingFiles);
        
        // Update screenshots state with existing files
        setScreenshots(prev => prev.map(s => ({
          ...s,
          captured: existingFiles.includes(s.filename),
          url: existingFiles.includes(s.filename) 
            ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/tutorial-screenshots/${s.filename}`
            : undefined
        })));
      } catch (error) {
        console.error('Error fetching existing screenshots:', error);
      }
    };

    fetchExistingScreenshots();
  }, []);

  const captureCurrentPage = useCallback(async (): Promise<Blob | null> => {
    try {
      const mainContent = document.querySelector('main') || document.body;
      
      const canvas = await html2canvas(mainContent as HTMLElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0a0a0f',
        scale: 2,
        logging: false,
        windowWidth: 1920,
        windowHeight: 1080,
        onclone: (clonedDoc) => {
          // Remove any modals or overlays for cleaner screenshots
          const modals = clonedDoc.querySelectorAll('[role="dialog"], [data-radix-portal]');
          modals.forEach(modal => modal.remove());
        }
      });

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png', 1.0);
      });
    } catch (error) {
      console.error('Screenshot error:', error);
      return null;
    }
  }, []);

  const uploadToStorage = useCallback(async (blob: Blob, filename: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('tutorial-screenshots')
        .upload(filename, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/png'
        });

      if (error) throw error;

      const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/tutorial-screenshots/${filename}`;
      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  }, []);

  const captureStep = useCallback(async (step: TourStep) => {
    setIsCapturing(true);
    setScreenshots(prev => prev.map(s => 
      s.id === step.id ? { ...s, uploading: true } : s
    ));

    try {
      const blob = await captureCurrentPage();
      
      if (blob) {
        const url = await uploadToStorage(blob, step.filename);
        
        if (url) {
          setScreenshots(prev => prev.map(s => 
            s.id === step.id ? { ...s, captured: true, uploading: false, url } : s
          ));
          toast.success(`${step.name} capturé et sauvegardé !`);
        } else {
          throw new Error('Upload failed');
        }
      } else {
        throw new Error('Capture failed');
      }
    } catch (error) {
      console.error('Error capturing step:', error);
      toast.error(`Erreur lors de la capture de ${step.name}`);
      setScreenshots(prev => prev.map(s => 
        s.id === step.id ? { ...s, uploading: false } : s
      ));
    } finally {
      setIsCapturing(false);
    }
  }, [captureCurrentPage, uploadToStorage]);

  const runTour = useCallback(async () => {
    if (isRunning && !isPaused) return;
    
    setIsRunning(true);
    setIsPaused(false);

    for (let i = currentStepIndex; i < tourSteps.length; i++) {
      if (isPaused) break;
      
      const step = tourSteps[i];
      setCurrentStepIndex(i);
      
      // Navigate to the page
      navigate(step.route);
      toast.info(`Navigation vers ${step.name}...`);
      
      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, step.captureDelay));
      
      // Capture the page
      await captureStep(step);
      
      // Small delay between captures
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
    setCurrentStepIndex(0);
    toast.success("Tour terminé ! Toutes les captures sont sauvegardées.");
    
    // Navigate back to tutorial page
    navigate('/tutorial');
  }, [isRunning, isPaused, currentStepIndex, navigate, captureStep]);

  const pauseTour = useCallback(() => {
    setIsPaused(true);
    setIsRunning(false);
    toast.info("Tour mis en pause");
  }, []);

  const skipStep = useCallback(() => {
    if (currentStepIndex < tourSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      const nextStep = tourSteps[currentStepIndex + 1];
      navigate(nextStep.route);
    }
  }, [currentStepIndex, navigate]);

  const resetTour = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setCurrentStepIndex(0);
    setScreenshots(prev => prev.map(s => ({ ...s, captured: false, url: undefined })));
  }, []);

  const captureCurrentManual = useCallback(async () => {
    // Find which step matches current route
    const currentStep = tourSteps.find(s => s.route === location.pathname);
    if (currentStep) {
      await captureStep(currentStep);
    } else {
      toast.error("Cette page n'est pas dans la liste des captures du tutoriel");
    }
  }, [location.pathname, captureStep]);

  const progress = ((screenshots.filter(s => s.captured).length) / tourSteps.length) * 100;

  return (
    <Card className="glass-card border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          Tour de Capture Automatique
        </CardTitle>
        <CardDescription>
          Naviguez automatiquement à travers toutes les pages et capturez des screenshots pour le tutoriel.
          Les captures sont sauvegardées dans le stockage et utilisées pour générer le PDF.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-medium">{screenshots.filter(s => s.captured).length}/{tourSteps.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          {!isRunning ? (
            <Button onClick={runTour} disabled={isCapturing}>
              <Play className="w-4 h-4 mr-2" />
              {isPaused ? "Reprendre" : "Démarrer le tour"}
            </Button>
          ) : (
            <Button onClick={pauseTour} variant="secondary">
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          )}
          
          <Button onClick={skipStep} variant="outline" disabled={!isRunning || currentStepIndex >= tourSteps.length - 1}>
            <SkipForward className="w-4 h-4 mr-2" />
            Passer
          </Button>
          
          <Button onClick={captureCurrentManual} variant="outline" disabled={isCapturing || isRunning}>
            {isCapturing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Camera className="w-4 h-4 mr-2" />
            )}
            Capturer cette page
          </Button>
          
          <Button onClick={resetTour} variant="ghost" disabled={isRunning}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
        </div>

        {/* Current step indicator */}
        {isRunning && (
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div>
                <div className="font-medium">En cours: {tourSteps[currentStepIndex]?.name}</div>
                <div className="text-sm text-muted-foreground">{tourSteps[currentStepIndex]?.description}</div>
              </div>
            </div>
          </div>
        )}

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tourSteps.map((step, index) => {
            const screenshot = screenshots.find(s => s.id === step.id);
            const isCurrentStep = isRunning && index === currentStepIndex;
            
            return (
              <div 
                key={step.id}
                className={`p-3 rounded-lg border transition-all ${
                  isCurrentStep 
                    ? 'border-primary bg-primary/10' 
                    : screenshot?.captured 
                      ? 'border-green-500/50 bg-green-500/5'
                      : 'border-border/50 bg-background/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm flex items-center gap-2">
                      <span className="truncate">{step.name}</span>
                      {screenshot?.captured && (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                      {screenshot?.uploading && (
                        <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{step.description}</div>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {index + 1}
                  </Badge>
                </div>
                
                {screenshot?.url && (
                  <div className="mt-2 flex gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 text-xs flex-1"
                      onClick={() => window.open(screenshot.url, '_blank')}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Voir
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info */}
        <div className="p-4 rounded-lg bg-muted/50 border border-border/30">
          <div className="font-medium text-sm mb-2">Comment ça marche :</div>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Cliquez sur "Démarrer le tour" pour lancer la capture automatique</li>
            <li>Le système naviguera vers chaque page et prendra une capture</li>
            <li>Les captures sont automatiquement sauvegardées dans le stockage</li>
            <li>Le PDF du tutoriel utilisera ces captures actualisées</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
