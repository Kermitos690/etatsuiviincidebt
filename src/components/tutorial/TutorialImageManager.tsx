import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Image, 
  Trash2, 
  RefreshCw, 
  Download, 
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TutorialImage {
  filename: string;
  name: string;
  description: string;
  exists: boolean;
  url?: string;
  size?: number;
  updatedAt?: string;
}

const expectedImages: Omit<TutorialImage, 'exists' | 'url' | 'size' | 'updatedAt'>[] = [
  { filename: "dashboard.png", name: "Dashboard", description: "Tableau de bord principal" },
  { filename: "gmail-config.png", name: "Configuration Gmail", description: "Page de configuration Gmail" },
  { filename: "email-sync.png", name: "Synchronisation", description: "Boîte de réception des emails" },
  { filename: "analysis-pipeline.png", name: "Pipeline d'Analyse", description: "Pipeline d'analyse IA" },
  { filename: "emails-analyzed.png", name: "Emails Analysés", description: "Liste des emails analysés" },
  { filename: "incidents.png", name: "Incidents", description: "Gestion des incidents" },
  { filename: "attachments.png", name: "Pièces Jointes", description: "Gestionnaire de pièces jointes" },
  { filename: "violations.png", name: "Violations", description: "Dashboard des violations" },
  { filename: "exports.png", name: "Exports", description: "Page d'exportation" },
  { filename: "ia-auditor.png", name: "IA Auditeur", description: "Interface IA Auditeur" },
  { filename: "ia-training.png", name: "Entrainement IA", description: "Page d'entraînement IA" },
];

export function TutorialImageManager() {
  const [images, setImages] = useState<TutorialImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<TutorialImage | null>(null);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('tutorial-screenshots')
        .list('', { limit: 100 });

      if (error) throw error;

      const fileMap = new Map(data?.map(f => [f.name, f]) || []);
      
      const imageList: TutorialImage[] = expectedImages.map(img => {
        const file = fileMap.get(img.filename);
        return {
          ...img,
          exists: !!file,
          url: file ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/tutorial-screenshots/${img.filename}` : undefined,
          size: file?.metadata?.size,
          updatedAt: file?.updated_at,
        };
      });

      setImages(imageList);
    } catch (error) {
      console.error('Error fetching images:', error);
      toast.error("Erreur lors du chargement des images");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const deleteImage = async (filename: string) => {
    try {
      const { error } = await supabase.storage
        .from('tutorial-screenshots')
        .remove([filename]);

      if (error) throw error;

      toast.success(`${filename} supprimé`);
      fetchImages();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const downloadImage = async (image: TutorialImage) => {
    if (!image.url) return;

    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = image.filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${image.filename} téléchargé`);
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error("Erreur lors du téléchargement");
    }
  };

  const existingCount = images.filter(i => i.exists).length;
  const totalCount = images.length;

  return (
    <Card className="glass-card border-border/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5 text-primary" />
              Gestionnaire d'images du tutoriel
            </CardTitle>
            <CardDescription>
              Images stockées dans Supabase Storage pour le PDF du tutoriel
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={existingCount === totalCount ? "default" : "secondary"}>
              {existingCount}/{totalCount} images
            </Badge>
            <Button onClick={fetchImages} variant="outline" size="sm" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => (
              <div 
                key={image.filename}
                className={`p-4 rounded-lg border transition-all ${
                  image.exists 
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-destructive/30 bg-destructive/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm flex items-center gap-2">
                      {image.exists ? (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                      )}
                      <span className="truncate">{image.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{image.description}</div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground mb-3">
                  <code className="bg-muted px-1 rounded">{image.filename}</code>
                </div>

                {image.exists && image.url ? (
                  <div className="space-y-3">
                    {/* Thumbnail */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="w-full aspect-video rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 transition-all cursor-pointer group">
                          <img 
                            src={image.url} 
                            alt={image.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>{image.name}</DialogTitle>
                        </DialogHeader>
                        <div className="rounded-lg overflow-hidden border border-border">
                          <img 
                            src={image.url} 
                            alt={image.name}
                            className="w-full h-auto"
                          />
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 h-8"
                        onClick={() => downloadImage(image)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        DL
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 h-8"
                        onClick={() => window.open(image.url, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Ouvrir
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={() => deleteImage(image.filename)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    {image.updatedAt && (
                      <div className="text-xs text-muted-foreground">
                        Mis à jour: {new Date(image.updatedAt).toLocaleDateString('fr-CH')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Pas encore capturé
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
