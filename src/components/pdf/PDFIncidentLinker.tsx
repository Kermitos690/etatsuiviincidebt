import React, { useState, useEffect } from 'react';
import { Link2, AlertTriangle, Plus, X, Check, Loader2, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PDFDocument, PDFIncident } from './types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Incident {
  id: string;
  titre: string;
  institution: string;
  gravite: string;
  statut: string;
  date_incident: string;
  numero: number;
}

interface PDFIncidentLinkerProps {
  document: PDFDocument;
  onIncidentLinked?: () => void;
}

function getGravityColor(gravite: string): string {
  switch (gravite.toLowerCase()) {
    case 'critique': return 'bg-red-500/20 text-red-500';
    case 'grave': return 'bg-orange-500/20 text-orange-500';
    case 'modéré': return 'bg-yellow-500/20 text-yellow-500';
    default: return 'bg-blue-500/20 text-blue-500';
  }
}

export function PDFIncidentLinker({ document, onIncidentLinked }: PDFIncidentLinkerProps) {
  const navigate = useNavigate();
  const [linkedIncidents, setLinkedIncidents] = useState<Incident[]>([]);
  const [availableIncidents, setAvailableIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const fetchLinkedIncidents = async () => {
    const { data: links } = await supabase
      .from('pdf_incidents')
      .select('incident_id')
      .eq('document_id', document.id);

    if (links && links.length > 0) {
      const incidentIds = links.map(l => l.incident_id).filter(Boolean);
      if (incidentIds.length > 0) {
        const { data: incidents } = await supabase
          .from('incidents')
          .select('id, titre, institution, gravite, statut, date_incident, numero')
          .in('id', incidentIds);

        if (incidents) {
          setLinkedIncidents(incidents);
        }
      }
    } else {
      setLinkedIncidents([]);
    }
  };

  const fetchAvailableIncidents = async () => {
    setIsLoading(true);
    const { data: incidents, error } = await supabase
      .from('incidents')
      .select('id, titre, institution, gravite, statut, date_incident, numero')
      .order('date_incident', { ascending: false })
      .limit(50);

    if (!error && incidents) {
      const linkedIds = new Set(linkedIncidents.map(i => i.id));
      setAvailableIncidents(incidents.filter(i => !linkedIds.has(i.id)));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLinkedIncidents();
  }, [document.id]);

  useEffect(() => {
    if (isDialogOpen) {
      fetchAvailableIncidents();
    }
  }, [isDialogOpen, linkedIncidents]);

  const handleLinkIncident = async (incidentId: string) => {
    setLinkingId(incidentId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('pdf_incidents')
        .insert({
          document_id: document.id,
          incident_id: incidentId,
          user_id: user.id,
        });

      if (error) throw error;

      toast.success('Document lié à l\'incident');
      await fetchLinkedIncidents();
      onIncidentLinked?.();
    } catch (error) {
      toast.error('Erreur lors de la liaison');
    } finally {
      setLinkingId(null);
    }
  };

  const handleUnlinkIncident = async (incidentId: string) => {
    try {
      const { error } = await supabase
        .from('pdf_incidents')
        .delete()
        .eq('document_id', document.id)
        .eq('incident_id', incidentId);

      if (error) throw error;

      toast.success('Liaison supprimée');
      await fetchLinkedIncidents();
      onIncidentLinked?.();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleCreateIncidentFromPDF = async () => {
    if (!document.analysis?.ai_analysis?.isIncident) {
      toast.info('Ce document ne contient pas d\'incident détecté par l\'IA');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const aiAnalysis = document.analysis.ai_analysis;
      
      const { data: incident, error } = await supabase
        .from('incidents')
        .insert({
          user_id: user.id,
          titre: aiAnalysis.suggestedTitle || `Incident - ${document.original_filename}`,
          institution: aiAnalysis.suggestedInstitution || 'À définir',
          faits: aiAnalysis.suggestedFacts || document.analysis.summary || '',
          dysfonctionnement: aiAnalysis.suggestedDysfunction || '',
          type: aiAnalysis.suggestedType || 'Autre',
          gravite: aiAnalysis.suggestedGravity || 'Modéré',
          date_incident: new Date().toISOString().split('T')[0],
          statut: 'Ouvert',
          priorite: 'moyenne',
        })
        .select()
        .single();

      if (error) throw error;

      // Link the PDF to the new incident
      if (incident) {
        await supabase
          .from('pdf_incidents')
          .insert({
            document_id: document.id,
            incident_id: incident.id,
            user_id: user.id,
          });

        toast.success('Incident créé et lié au document');
        await fetchLinkedIncidents();
        navigate(`/incidents/${incident.id}`);
      }
    } catch (error) {
      toast.error('Erreur lors de la création de l\'incident');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Incidents liés</span>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" />
              Lier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Lier à un incident</DialogTitle>
            </DialogHeader>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : availableIncidents.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun incident disponible</p>
                {document.analysis?.ai_analysis?.isIncident && (
                  <Button className="mt-4" onClick={handleCreateIncidentFromPDF}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer depuis l'analyse IA
                  </Button>
                )}
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                <div className="space-y-2 pr-4">
                  {availableIncidents.map(incident => (
                    <div 
                      key={incident.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            #{incident.numero}
                          </Badge>
                          <Badge className={getGravityColor(incident.gravite)}>
                            {incident.gravite}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm truncate mt-1">{incident.titre}</p>
                        <p className="text-xs text-muted-foreground">
                          {incident.institution} • {format(new Date(incident.date_incident), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleLinkIncident(incident.id)}
                        disabled={linkingId === incident.id}
                      >
                        {linkingId === incident.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* AI suggestion for new incident */}
      {document.analysis?.ai_analysis?.isIncident && linkedIncidents.length === 0 && (
        <Card className="p-3 border-primary/30 bg-primary/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Incident détecté par l'IA</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {document.analysis.ai_analysis.suggestedTitle}
              </p>
              <Button 
                size="sm" 
                className="mt-2 h-7 text-xs"
                onClick={handleCreateIncidentFromPDF}
              >
                <Plus className="h-3 w-3 mr-1" />
                Créer l'incident
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Linked incidents list */}
      {linkedIncidents.length > 0 && (
        <div className="space-y-2">
          {linkedIncidents.map(incident => (
            <div 
              key={incident.id}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  #{incident.numero}
                </Badge>
                <span className="text-sm truncate">{incident.titre}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => navigate(`/incidents/${incident.id}`)}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => handleUnlinkIncident(incident.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {linkedIncidents.length === 0 && !document.analysis?.ai_analysis?.isIncident && (
        <p className="text-xs text-muted-foreground">Aucun incident lié</p>
      )}
    </div>
  );
}

export default PDFIncidentLinker;
