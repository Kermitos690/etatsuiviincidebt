import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, FileText, Image, Video, ClipboardPaste, 
  Loader2, ArrowLeft, AlertTriangle, CheckCircle2, 
  FileUp, Link as LinkIcon, Sparkles
} from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

interface AnalysisResult {
  summary: string;
  keyFacts: string[];
  potentialIssues: string[];
  promises: string[];
  severity: 'critique' | 'haute' | 'moyenne' | 'faible';
  incidentRecommendation: {
    shouldCreate: boolean;
    titre: string;
    type: string;
    gravite: string;
    faits: string;
    dysfonctionnement: string;
    institution: string;
  } | null;
  relatedIncidents: Array<{
    id: string;
    numero: number;
    titre: string;
    similarity: number;
  }>;
}

interface CreatedIncident {
  id: string;
  numero: number;
  titre: string;
}

export default function ImportIncident() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [createdIncident, setCreatedIncident] = useState<CreatedIncident | null>(null);
  const [isCreatingIncident, setIsCreatingIncident] = useState(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(file => {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/webp',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'text/plain',
      ];
      return validTypes.includes(file.type) || file.name.endsWith('.doc') || file.name.endsWith('.docx');
    });
    
    if (validFiles.length !== selectedFiles.length) {
      toast.warning('Certains fichiers ont été ignorés (formats non supportés)');
    }
    
    setFiles(prev => [...prev, ...validFiles]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const analyzeContent = useCallback(async () => {
    if (!content.trim() && files.length === 0) {
      toast.error('Veuillez coller du texte ou importer des fichiers');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(10);
    setAnalysisResult(null);
    setCreatedIncident(null);

    try {
      let textContent = content;
      
      // Si des fichiers sont présents, les uploader et extraire le texte
      if (files.length > 0) {
        setAnalysisProgress(20);
        
        for (const file of files) {
          // Upload du fichier
          const filePath = `import-incidents/${user?.id}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('event-files')
            .upload(filePath, file);
          
          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }
          
          // Pour les fichiers texte, lire le contenu directement
          if (file.type === 'text/plain') {
            const fileText = await file.text();
            textContent += '\n\n--- Contenu du fichier: ' + file.name + ' ---\n' + fileText;
          } else {
            // Pour les autres fichiers, noter leur présence
            textContent += `\n\n[Fichier importé: ${file.name} (${file.type})]`;
          }
        }
        setAnalysisProgress(40);
      }

      setAnalysisProgress(50);

      // Appeler la fonction d'analyse
      const { data, error } = await supabase.functions.invoke('analyze-import-incident', {
        body: { 
          content: textContent,
          userId: user?.id,
        },
      });

      setAnalysisProgress(80);

      if (error) throw error;

      setAnalysisResult(data);
      setAnalysisProgress(100);
      
      if (data.incidentRecommendation?.shouldCreate) {
        toast.success('Analyse terminée - Un incident peut être créé');
      } else {
        toast.info('Analyse terminée - Aucun incident détecté');
      }

    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Erreur lors de l\'analyse: ' + (error as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [content, files, user?.id]);

  const createIncident = useCallback(async () => {
    if (!analysisResult?.incidentRecommendation) return;
    
    setIsCreatingIncident(true);
    
    try {
      const rec = analysisResult.incidentRecommendation;
      
      const { data, error } = await supabase
        .from('incidents')
        .insert({
          titre: rec.titre,
          type: rec.type,
          gravite: rec.gravite,
          faits: rec.faits,
          dysfonctionnement: rec.dysfonctionnement,
          institution: rec.institution,
          date_incident: new Date().toISOString().split('T')[0],
          statut: 'Ouvert',
          user_id: user?.id,
          confidence_level: 'import_manuel',
        })
        .select('id, numero, titre')
        .single();

      if (error) throw error;

      setCreatedIncident(data);
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success(`Incident #${data.numero} créé avec succès`);
      
    } catch (error) {
      console.error('Create incident error:', error);
      toast.error('Erreur lors de la création: ' + (error as Error).message);
    } finally {
      setIsCreatingIncident(false);
    }
  }, [analysisResult, user?.id, queryClient]);

  const reset = useCallback(() => {
    setContent('');
    setFiles([]);
    setAnalysisResult(null);
    setCreatedIncident(null);
    setAnalysisProgress(0);
  }, []);

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critique': return 'destructive';
      case 'haute': return 'destructive';
      case 'moyenne': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>

        <PageHeader 
          title="Import d'incident"
          description="Créez un incident à partir de texte copié ou de fichiers importés (PDF, Word, images, vidéos)"
        />

        {/* Zone d'import */}
        {!analysisResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Source du contenu
              </CardTitle>
              <CardDescription>
                Collez du texte (emails, échanges) ou importez des fichiers pour analyse automatique
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="paste" className="flex items-center gap-2">
                    <ClipboardPaste className="h-4 w-4" />
                    Coller du texte
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Importer fichiers
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="paste" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Contenu à analyser</Label>
                    <Textarea
                      placeholder="Collez ici le texte des emails, échanges, ou tout contenu pertinent...&#10;&#10;Exemple:&#10;De: service@institution.ch&#10;Objet: Réponse à votre demande&#10;&#10;Madame, Monsieur,&#10;Suite à votre courrier du..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-[300px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      {content.length} caractères • Minimum recommandé: 100 caractères
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp,.mp4,.webm,.mov"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-muted rounded-full">
                          <FileUp className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">Cliquez pour sélectionner des fichiers</p>
                          <p className="text-sm text-muted-foreground">
                            PDF, Word, Images, Vidéos
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>

                  {files.length > 0 && (
                    <div className="space-y-2">
                      <Label>Fichiers sélectionnés ({files.length})</Label>
                      <ScrollArea className="h-[200px] border rounded-lg p-2">
                        {files.map((file, index) => (
                          <div 
                            key={index}
                            className="flex items-center justify-between p-2 rounded hover:bg-muted"
                          >
                            <div className="flex items-center gap-3">
                              {file.type.startsWith('image/') ? (
                                <Image className="h-4 w-4 text-blue-500" />
                              ) : file.type.startsWith('video/') ? (
                                <Video className="h-4 w-4 text-purple-500" />
                              ) : (
                                <FileText className="h-4 w-4 text-orange-500" />
                              )}
                              <div>
                                <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(file.size / 1024).toFixed(1)} Ko
                                </p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeFile(index)}
                            >
                              Retirer
                            </Button>
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  )}

                  {/* Option texte complémentaire */}
                  <div className="space-y-2">
                    <Label>Contexte additionnel (optionnel)</Label>
                    <Textarea
                      placeholder="Ajoutez du contexte ou des notes..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Bouton d'analyse */}
              <div className="flex justify-end mt-6">
                <Button 
                  onClick={analyzeContent}
                  disabled={isAnalyzing || (!content.trim() && files.length === 0)}
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analyser et détecter incidents
                    </>
                  )}
                </Button>
              </div>

              {/* Barre de progression */}
              {isAnalyzing && (
                <div className="mt-4 space-y-2">
                  <Progress value={analysisProgress} className="h-2" />
                  <p className="text-sm text-center text-muted-foreground">
                    {analysisProgress < 50 
                      ? 'Préparation du contenu...' 
                      : analysisProgress < 80 
                        ? 'Analyse IA en cours...' 
                        : 'Finalisation...'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Résultat de l'analyse */}
        {analysisResult && !createdIncident && (
          <div className="space-y-6">
            {/* Résumé */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Analyse terminée
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Résumé</Label>
                  <p className="mt-1">{analysisResult.summary}</p>
                </div>

                {analysisResult.keyFacts.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Faits clés identifiés</Label>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {analysisResult.keyFacts.map((fact, i) => (
                        <li key={i} className="text-sm">{fact}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.potentialIssues.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Problèmes potentiels
                    </Label>
                    <ul className="mt-1 space-y-1">
                      {analysisResult.potentialIssues.map((issue, i) => (
                        <li key={i} className="text-sm text-orange-700 dark:text-orange-300">
                          • {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.promises.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Engagements détectés</Label>
                    <ul className="mt-1 space-y-1">
                      {analysisResult.promises.map((promise, i) => (
                        <li key={i} className="text-sm text-blue-700 dark:text-blue-300">
                          • {promise}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Incidents liés */}
            {analysisResult.relatedIncidents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" />
                    Incidents potentiellement liés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analysisResult.relatedIncidents.map((incident) => (
                      <div 
                        key={incident.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted cursor-pointer"
                        onClick={() => navigate(`/incidents/${incident.id}`)}
                      >
                        <div>
                          <p className="font-medium">#{incident.numero} - {incident.titre}</p>
                          <p className="text-sm text-muted-foreground">
                            Similarité: {Math.round(incident.similarity * 100)}%
                          </p>
                        </div>
                        <Badge variant="outline">Voir</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommandation d'incident */}
            {analysisResult.incidentRecommendation?.shouldCreate && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Création d'incident recommandée
                    <Badge variant={getSeverityBadgeVariant(analysisResult.severity)}>
                      {analysisResult.severity}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    L'analyse a identifié un dysfonctionnement pouvant constituer un incident
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Titre proposé</Label>
                      <p className="font-medium">{analysisResult.incidentRecommendation.titre}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Type</Label>
                      <p>{analysisResult.incidentRecommendation.type}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Institution</Label>
                      <p>{analysisResult.incidentRecommendation.institution}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Gravité</Label>
                      <Badge variant={getSeverityBadgeVariant(analysisResult.incidentRecommendation.gravite)}>
                        {analysisResult.incidentRecommendation.gravite}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Faits</Label>
                    <p className="text-sm mt-1">{analysisResult.incidentRecommendation.faits}</p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Dysfonctionnement</Label>
                    <p className="text-sm mt-1">{analysisResult.incidentRecommendation.dysfonctionnement}</p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={createIncident}
                      disabled={isCreatingIncident}
                      className="flex-1"
                    >
                      {isCreatingIncident ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Création...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Créer cet incident
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={reset}>
                      Nouvelle analyse
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pas d'incident recommandé */}
            {!analysisResult.incidentRecommendation?.shouldCreate && (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">Aucun incident détecté</p>
                  <p className="text-muted-foreground mt-2">
                    Le contenu analysé ne semble pas contenir de dysfonctionnement significatif.
                  </p>
                  <Button variant="outline" onClick={reset} className="mt-4">
                    Nouvelle analyse
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Incident créé */}
        {createdIncident && (
          <Card className="border-green-500">
            <CardContent className="py-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">
                Incident #{createdIncident.numero} créé
              </h2>
              <p className="text-muted-foreground mb-6">
                {createdIncident.titre}
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate(`/incidents/${createdIncident.id}`)}>
                  Voir l'incident
                </Button>
                <Button variant="outline" onClick={reset}>
                  Importer un autre
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
