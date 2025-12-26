import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Download, CheckCircle, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";

interface ScreenshotTarget {
  id: string;
  name: string;
  route: string;
  filename: string;
  description: string;
}

const screenshotTargets: ScreenshotTarget[] = [
  { id: "gmail-config", name: "Configuration Gmail", route: "/gmail-config", filename: "gmail-config.png", description: "Page de configuration Gmail" },
  { id: "email-sync", name: "Synchronisation Emails", route: "/emails", filename: "email-sync.png", description: "Boîte de réception des emails" },
  { id: "analysis-pipeline", name: "Pipeline d'Analyse", route: "/analysis-pipeline", filename: "analysis-pipeline.png", description: "Pipeline d'analyse IA" },
  { id: "emails-analyzed", name: "Emails Analysés", route: "/emails-analyzed", filename: "emails-analyzed.png", description: "Liste des emails analysés" },
  { id: "incidents", name: "Incidents", route: "/incidents", filename: "incidents.png", description: "Gestion des incidents" },
  { id: "dashboard", name: "Tableau de Bord", route: "/", filename: "dashboard.png", description: "Dashboard principal" },
  { id: "attachments", name: "Pièces Jointes", route: "/attachments", filename: "attachments.png", description: "Gestionnaire de pièces jointes" },
  { id: "violations", name: "Violations", route: "/violations", filename: "violations.png", description: "Dashboard des violations" },
  { id: "exports", name: "Exports", route: "/exports", filename: "exports.png", description: "Page d'exportation" },
  { id: "ia-auditor", name: "IA Auditeur", route: "/ia-auditeur", filename: "ia-auditor.png", description: "Interface IA Auditeur" },
  { id: "ia-training", name: "Entrainement IA", route: "/ia-training", filename: "ia-training.png", description: "Page d'entrainement IA" },
];

export function ScreenshotCapture() {
  const [capturing, setCapturing] = useState<string | null>(null);
  const [captured, setCaptured] = useState<Set<string>>(new Set());

  const captureCurrentPage = async () => {
    setCapturing("current");
    
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
      });

      const link = document.createElement('a');
      link.download = `screenshot-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success("Capture d'écran téléchargée !");
    } catch (error) {
      console.error('Screenshot error:', error);
      toast.error("Erreur lors de la capture");
    } finally {
      setCapturing(null);
    }
  };

  const captureTargetPage = async (target: ScreenshotTarget) => {
    setCapturing(target.id);
    
    // Open the target page in a new window
    const popup = window.open(target.route, '_blank', 'width=1920,height=1080');
    
    if (!popup) {
      toast.error("Impossible d'ouvrir la fenêtre. Vérifiez que les popups sont autorisés.");
      setCapturing(null);
      return;
    }

    toast.info(`Ouverture de ${target.name}... La capture sera téléchargée automatiquement.`);

    // Wait for the page to load, then capture
    setTimeout(async () => {
      try {
        const mainContent = popup.document.querySelector('main') || popup.document.body;
        
        const canvas = await html2canvas(mainContent as HTMLElement, {
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#0a0a0f',
          scale: 2,
          logging: false,
        });

        const link = document.createElement('a');
        link.download = target.filename;
        link.href = canvas.toDataURL('image/png');
        link.click();

        setCaptured(prev => new Set([...prev, target.id]));
        toast.success(`${target.name} capturé !`);
        popup.close();
      } catch (error) {
        console.error('Screenshot error:', error);
        toast.error(`Erreur lors de la capture de ${target.name}. Essayez la méthode manuelle.`);
      } finally {
        setCapturing(null);
      }
    }, 3000);
  };

  const openPageForManualCapture = (target: ScreenshotTarget) => {
    window.open(target.route, '_blank');
    toast.info(
      `Page ouverte. Utilisez Cmd+Shift+4 (Mac) ou Win+Shift+S (Windows) pour capturer, puis enregistrez sous: ${target.filename}`,
      { duration: 8000 }
    );
  };

  return (
    <Card className="glass-card border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          Outil de capture d'écran
        </CardTitle>
        <CardDescription>
          Prenez des captures d'écran des différentes pages pour mettre à jour le tutoriel.
          Les fichiers téléchargés doivent être placés dans <code className="bg-muted px-1 rounded">src/assets/tutorial/</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick capture current page */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div>
            <div className="font-medium">Capturer la page actuelle</div>
            <div className="text-sm text-muted-foreground">Prend une capture de ce que vous voyez maintenant</div>
          </div>
          <Button onClick={captureCurrentPage} disabled={capturing !== null}>
            {capturing === "current" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Camera className="w-4 h-4 mr-2" />
            )}
            Capturer
          </Button>
        </div>

        {/* Target pages grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {screenshotTargets.map((target) => (
            <div 
              key={target.id}
              className="p-4 rounded-lg border border-border/50 bg-background/50 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-sm flex items-center gap-2">
                    {target.name}
                    {captured.has(target.id) && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{target.description}</div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {target.filename}
                </Badge>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => openPageForManualCapture(target)}
                  className="flex-1"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Ouvrir
                </Button>
                <Button 
                  size="sm"
                  onClick={() => captureTargetPage(target)}
                  disabled={capturing !== null}
                  className="flex-1"
                >
                  {capturing === target.id ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3 mr-1" />
                  )}
                  Capturer
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="font-medium text-yellow-400 mb-2">Instructions</div>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Cliquez sur "Ouvrir" pour visualiser la page ou "Capturer" pour télécharger automatiquement</li>
            <li>Si la capture automatique échoue, utilisez les raccourcis système (Cmd+Shift+4 ou Win+Shift+S)</li>
            <li>Renommez le fichier avec le nom indiqué (ex: gmail-config.png)</li>
            <li>Placez les fichiers dans <code className="bg-muted px-1 rounded">src/assets/tutorial/</code></li>
            <li>Relancez l'export PDF pour inclure les nouvelles captures</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
