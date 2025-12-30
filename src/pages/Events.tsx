import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Plus, FileText, Image, Video, Upload, Sparkles, 
  Calendar, AlertTriangle, CheckCircle, Clock, Trash2,
  ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string;
  content: string | null;
  source_type: string | null;
  file_path: string | null;
  file_name: string | null;
  ai_analysis: any;
  is_analyzed: boolean;
  incident_id: string | null;
  created_at: string;
}

const EventCard = ({ event, onAnalyze, onDelete, isAnalyzing }: { 
  event: Event; 
  onAnalyze: (id: string) => void;
  onDelete: (id: string) => void;
  isAnalyzing: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const analysis = event.ai_analysis;

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critique': return 'bg-red-500';
      case 'élevée': return 'bg-orange-500';
      case 'moyenne': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {event.source_type || event.event_type}
              </Badge>
              {event.is_analyzed && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Analysé
                </Badge>
              )}
              {event.incident_id && (
                <Badge className="text-xs bg-primary">
                  Incident créé
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg">{event.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              <Calendar className="w-3 h-3 inline mr-1" />
              {format(new Date(event.event_date), 'PPP', { locale: fr })}
            </p>
          </div>
          <div className="flex gap-2">
            {!event.is_analyzed && (
              <Button 
                size="sm" 
                onClick={() => onAnalyze(event.id)}
                disabled={isAnalyzing}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                {isAnalyzing ? 'Analyse...' : 'Analyser'}
              </Button>
            )}
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onDelete(event.id)}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-2">
          {event.content && (
            <div className="bg-muted/50 rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">{event.content}</p>
            </div>
          )}
          
          {analysis && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Résumé IA</h4>
                <p className="text-sm text-muted-foreground">{analysis.summary}</p>
              </div>
              
              {analysis.key_facts?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Faits clés</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {analysis.key_facts.map((fact: string, i: number) => (
                      <li key={i} className="text-muted-foreground">{fact}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {analysis.potential_issues?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    Problèmes détectés
                  </h4>
                  <div className="space-y-2">
                    {analysis.potential_issues.map((issue: any, i: number) => (
                      <div key={i} className="bg-destructive/10 rounded-lg p-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 rounded-full ${getSeverityColor(issue.severity)}`} />
                          <span className="text-sm font-medium">{issue.type}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{issue.description}</p>
                        {issue.legal_basis && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Base légale: {issue.legal_basis}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.promises_or_commitments?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Promesses/Engagements</h4>
                  <div className="space-y-2">
                    {analysis.promises_or_commitments.map((p: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Badge variant={p.status === 'brisé' ? 'destructive' : p.status === 'tenu' ? 'default' : 'secondary'}>
                          {p.status}
                        </Badge>
                        <span className="text-muted-foreground">{p.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.incident_recommendation?.should_create && !event.incident_id && (
                <div className="bg-primary/10 rounded-lg p-3">
                  <p className="text-sm font-medium">
                    L'IA recommande de créer un incident: {analysis.incident_recommendation.suggested_title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analysis.incident_recommendation.justification}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

const Events = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('list');
  const [newEvent, setNewEvent] = useState({
    title: '',
    content: '',
    eventDate: new Date().toISOString().split('T')[0],
    sourceType: 'paste',
  });
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });
      
      if (error) throw error;
      return data as Event[];
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: typeof newEvent) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('events')
        .insert({
          user_id: user.id,
          title: eventData.title,
          content: eventData.content,
          event_date: eventData.eventDate,
          source_type: eventData.sourceType,
          event_type: 'manual',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Événement créé');
      setNewEvent({ title: '', content: '', eventDate: new Date().toISOString().split('T')[0], sourceType: 'paste' });
      setActiveTab('list');
      
      // Lancer l'analyse automatiquement
      analyzeEvent(data.id);
    },
    onError: (error) => {
      toast.error('Erreur: ' + (error as Error).message);
    },
  });

  const analyzeEvent = useCallback(async (eventId: string) => {
    setAnalyzingId(eventId);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-event', {
        body: { eventId },
      });

      if (error) throw error;

      if (data.createdIncident) {
        toast.success(`Incident #${data.createdIncident.numero} créé automatiquement`);
      } else {
        toast.success('Analyse terminée');
      }

      queryClient.invalidateQueries({ queryKey: ['events'] });
    } catch (error) {
      toast.error('Erreur d\'analyse: ' + (error as Error).message);
    } finally {
      setAnalyzingId(null);
    }
  }, [queryClient]);

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      
      toast.success('Événement supprimé');
      queryClient.invalidateQueries({ queryKey: ['events'] });
    } catch (error) {
      toast.error('Erreur: ' + (error as Error).message);
    }
  }, [queryClient]);

  const handleFileUpload = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Non authentifié');
      return;
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('event-files')
      .upload(filePath, file);

    if (uploadError) {
      toast.error('Erreur upload: ' + uploadError.message);
      return;
    }

    // Déterminer le type de source
    let sourceType = 'document';
    if (file.type.startsWith('image/')) sourceType = 'screenshot';
    else if (file.type.startsWith('video/')) sourceType = 'video';
    else if (file.type.includes('pdf')) sourceType = 'pdf';
    else if (file.type.includes('word')) sourceType = 'word';

    // Créer l'événement
    const { data, error } = await supabase
      .from('events')
      .insert({
        user_id: user.id,
        title: file.name,
        event_date: new Date().toISOString(),
        event_type: 'document',
        source_type: sourceType,
        file_path: filePath,
        file_name: file.name,
        file_mime_type: file.type,
        file_size_bytes: file.size,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erreur création: ' + error.message);
      return;
    }

    toast.success('Fichier uploadé');
    queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Événements" 
        description="Documentez manuellement les faits pour votre dossier"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Mes événements
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Ajouter
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement...
            </div>
          ) : events.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun événement</h3>
              <p className="text-muted-foreground mb-4">
                Commencez à documenter les faits importants pour votre dossier
              </p>
              <Button onClick={() => setActiveTab('new')}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un événement
              </Button>
            </Card>
          ) : (
            <div>
              {events.map(event => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  onAnalyze={analyzeEvent}
                  onDelete={deleteEvent}
                  isAnalyzing={analyzingId === event.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle>Nouvel événement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Titre</label>
                <Input
                  placeholder="Ex: Réunion avec le curateur, Appel téléphonique..."
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Date de l'événement</label>
                <Input
                  type="date"
                  value={newEvent.eventDate}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, eventDate: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Type de source</label>
                <div className="flex gap-2">
                  {[
                    { value: 'paste', label: 'Texte', icon: FileText },
                    { value: 'screenshot', label: 'Capture', icon: Image },
                    { value: 'video', label: 'Vidéo', icon: Video },
                  ].map(({ value, label, icon: Icon }) => (
                    <Button
                      key={value}
                      type="button"
                      variant={newEvent.sourceType === value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewEvent(prev => ({ ...prev, sourceType: value }))}
                    >
                      <Icon className="w-4 h-4 mr-1" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Contenu (copier/coller le texte, description, etc.)
                </label>
                <Textarea
                  placeholder="Collez ici le contenu d'un email, d'un document, ou décrivez l'événement..."
                  rows={10}
                  value={newEvent.content}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>

              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Ou importez un fichier (PDF, Word, image, vidéo)
                </p>
                <input
                  type="file"
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.mp4,.webm,.mov"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" asChild>
                    <span>Choisir un fichier</span>
                  </Button>
                </label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setActiveTab('list')}>
                  Annuler
                </Button>
                <Button 
                  onClick={() => createEventMutation.mutate(newEvent)}
                  disabled={!newEvent.title || !newEvent.content || createEventMutation.isPending}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {createEventMutation.isPending ? 'Création...' : 'Créer et analyser'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Events;
