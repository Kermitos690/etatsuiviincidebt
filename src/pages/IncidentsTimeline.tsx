import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Send, 
  AlertTriangle, 
  FileText, 
  Mail,
  ChevronLeft,
  ChevronRight,
  Clock,
  Shield,
  Quote,
  Paperclip,
  Filter,
  ExternalLink
} from "lucide-react";
import { EmailLink } from "@/components/email";

type Incident = {
  id: string;
  numero: number;
  titre: string;
  date_incident: string;
  gravite: string;
  score: number;
  statut: string;
  institution: string;
  type: string;
  faits: string;
  dysfonctionnement: string;
  transmis_jp: boolean;
  confidence_level: string | null;
  validated_at: string | null;
  validated_by: string | null;
  rejection_reason: string | null;
  preuves: any;
  gmail_references: any;
  email_source_id: string | null;
};

const getSeverityConfig = (gravite: string) => {
  switch (gravite.toLowerCase()) {
    case 'critique':
      return { color: 'bg-red-500', border: 'border-red-500', text: 'text-red-500', icon: '🔴' };
    case 'haute':
    case 'élevée':
      return { color: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-500', icon: '🟠' };
    case 'moyenne':
      return { color: 'bg-yellow-500', border: 'border-yellow-500', text: 'text-yellow-500', icon: '🟡' };
    case 'faible':
      return { color: 'bg-green-500', border: 'border-green-500', text: 'text-green-500', icon: '🟢' };
    default:
      return { color: 'bg-gray-500', border: 'border-gray-500', text: 'text-gray-500', icon: '⚪' };
  }
};

export default function IncidentsTimeline() {
  const queryClient = useQueryClient();
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filter, setFilter] = useState<'all' | 'validated' | 'pending' | 'rejected' | 'transmitted'>('all');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch incidents
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents-timeline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('date_incident', { ascending: false });
      
      if (error) throw error;
      return data as Incident[];
    }
  });

  // Fetch email citations for selected incident
  const { data: emailCitations = [] } = useQuery({
    queryKey: ['email-citations', selectedIncident?.email_source_id],
    queryFn: async () => {
      if (!selectedIncident?.email_source_id) return [];
      
      const { data, error } = await supabase
        .from('emails')
        .select('id, subject, sender, body, received_at, ai_analysis')
        .eq('id', selectedIncident.email_source_id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedIncident?.email_source_id
  });

  // Fetch attachments for email
  const { data: attachments = [] } = useQuery({
    queryKey: ['incident-attachments', selectedIncident?.email_source_id],
    queryFn: async () => {
      if (!selectedIncident?.email_source_id) return [];
      
      const { data, error } = await supabase
        .from('email_attachments')
        .select('id, filename, mime_type, ai_analysis, extracted_text')
        .eq('email_id', selectedIncident.email_source_id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedIncident?.email_source_id
  });

  // Validate mutation
  const validateMutation = useMutation({
    mutationFn: async (incidentId: string) => {
      const { error } = await supabase
        .from('incidents')
        .update({ 
          validated_at: new Date().toISOString(),
          validated_by: 'Auditeur',
          statut: 'Validé'
        })
        .eq('id', incidentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents-timeline'] });
      toast.success("Incident validé avec succès");
      setSelectedIncident(null);
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ incidentId, reason }: { incidentId: string; reason: string }) => {
      const { error } = await supabase
        .from('incidents')
        .update({ 
          rejection_reason: reason,
          statut: 'Rejeté'
        })
        .eq('id', incidentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents-timeline'] });
      toast.success("Incident rejeté");
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedIncident(null);
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  // Transmit to JP mutation
  const transmitMutation = useMutation({
    mutationFn: async (incidentId: string) => {
      const { error } = await supabase
        .from('incidents')
        .update({ 
          transmis_jp: true,
          date_transmission_jp: new Date().toISOString().split('T')[0],
          statut: 'Transmis'
        })
        .eq('id', incidentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents-timeline'] });
      toast.success("Incident transmis au Juge de Paix");
      setSelectedIncident(null);
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  // Filter incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter(incident => {
      switch (filter) {
        case 'validated':
          return incident.validated_at !== null;
        case 'pending':
          return incident.validated_at === null && !incident.rejection_reason;
        case 'rejected':
          return incident.rejection_reason !== null;
        case 'transmitted':
          return incident.transmis_jp === true;
        default:
          return true;
      }
    });
  }, [incidents, filter]);

  // Get incidents for current month timeline
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const incidentsByDay = useMemo(() => {
    const map = new Map<string, Incident[]>();
    filteredIncidents.forEach(incident => {
      const dateKey = incident.date_incident;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(incident);
    });
    return map;
  }, [filteredIncidents]);

  // Stats
  const stats = useMemo(() => ({
    total: incidents.length,
    validated: incidents.filter(i => i.validated_at).length,
    pending: incidents.filter(i => !i.validated_at && !i.rejection_reason).length,
    rejected: incidents.filter(i => i.rejection_reason).length,
    transmitted: incidents.filter(i => i.transmis_jp).length,
    critical: incidents.filter(i => i.gravite.toLowerCase() === 'critique').length
  }), [incidents]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tableau de bord des incidents</h1>
            <p className="text-muted-foreground">Timeline visuelle et validation des incidents détectés</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous ({stats.total})</SelectItem>
                <SelectItem value="pending">En attente ({stats.pending})</SelectItem>
                <SelectItem value="validated">Validés ({stats.validated})</SelectItem>
                <SelectItem value="rejected">Rejetés ({stats.rejected})</SelectItem>
                <SelectItem value="transmitted">Transmis JP ({stats.transmitted})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total incidents</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.validated}</p>
                  <p className="text-xs text-muted-foreground">Validés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.transmitted}</p>
                  <p className="text-xs text-muted-foreground">Transmis JP</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.critical}</p>
                  <p className="text-xs text-muted-foreground">Critiques</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline - {format(currentMonth, 'MMMM yyyy', { locale: fr })}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto pb-4">
              <div className="flex items-end gap-1 min-w-max">
                {monthDays.map((day) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayIncidents = incidentsByDay.get(dateKey) || [];
                  const hasIncidents = dayIncidents.length > 0;
                  const maxSeverity = dayIncidents.reduce((max, inc) => {
                    const severities = ['faible', 'moyenne', 'haute', 'élevée', 'critique'];
                    const currentIndex = severities.indexOf(inc.gravite.toLowerCase());
                    const maxIndex = severities.indexOf(max);
                    return currentIndex > maxIndex ? inc.gravite.toLowerCase() : max;
                  }, 'faible');

                  return (
                    <div
                      key={dateKey}
                      className="flex flex-col items-center cursor-pointer group"
                      onClick={() => {
                        if (dayIncidents.length > 0) {
                          setSelectedIncident(dayIncidents[0]);
                        }
                      }}
                    >
                      {/* Incident dots */}
                      <div className="h-20 flex flex-col-reverse items-center justify-start gap-1 mb-1">
                        {dayIncidents.slice(0, 4).map((inc, idx) => {
                          const config = getSeverityConfig(inc.gravite);
                          return (
                            <div
                              key={inc.id}
                              className={`w-3 h-3 rounded-full ${config.color} transition-transform group-hover:scale-125`}
                              title={inc.titre}
                            />
                          );
                        })}
                        {dayIncidents.length > 4 && (
                          <span className="text-xs text-muted-foreground">+{dayIncidents.length - 4}</span>
                        )}
                      </div>
                      
                      {/* Day number */}
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-xs
                        ${hasIncidents ? getSeverityConfig(maxSeverity).color + ' text-white' : 'bg-muted text-muted-foreground'}
                        ${isSameDay(day, new Date()) ? 'ring-2 ring-primary' : ''}
                        transition-all group-hover:scale-110
                      `}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">Légende:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs">Critique</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-xs">Haute</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-xs">Moyenne</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs">Faible</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Incidents List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {isLoading ? (
            <Card className="col-span-2 p-8 text-center text-muted-foreground">
              Chargement des incidents...
            </Card>
          ) : filteredIncidents.length === 0 ? (
            <Card className="col-span-2 p-8 text-center text-muted-foreground">
              Aucun incident trouvé avec ce filtre
            </Card>
          ) : (
            filteredIncidents.slice(0, 20).map((incident) => {
              const config = getSeverityConfig(incident.gravite);
              return (
                <Card 
                  key={incident.id}
                  className={`cursor-pointer transition-all hover:shadow-lg border-l-4 ${config.border} ${
                    selectedIncident?.id === incident.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedIncident(incident)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{config.icon}</span>
                        <span className="font-mono text-sm text-muted-foreground">#{incident.numero}</span>
                        <Badge variant={incident.validated_at ? "default" : incident.rejection_reason ? "destructive" : "secondary"}>
                          {incident.validated_at ? "Validé" : incident.rejection_reason ? "Rejeté" : "En attente"}
                        </Badge>
                        {incident.transmis_jp && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                            <Send className="h-3 w-3 mr-1" />
                            Transmis JP
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(parseISO(incident.date_incident), 'dd/MM/yyyy')}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
                      {incident.titre}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {incident.dysfonctionnement}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{incident.institution}</Badge>
                        <Badge variant="outline">{incident.type}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Score: {incident.score}</span>
                        {incident.confidence_level && (
                          <span className="text-muted-foreground">| Confiance: {incident.confidence_level}%</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Selected Incident Detail Dialog */}
        <Dialog open={!!selectedIncident} onOpenChange={(open) => !open && setSelectedIncident(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedIncident && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <span>{getSeverityConfig(selectedIncident.gravite).icon}</span>
                    Incident #{selectedIncident.numero}
                    <Badge className={getSeverityConfig(selectedIncident.gravite).color}>
                      {selectedIncident.gravite}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="details">Détails</TabsTrigger>
                    <TabsTrigger value="citations">Citations</TabsTrigger>
                    <TabsTrigger value="attachments">Pièces jointes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-4 mt-4">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedIncident.titre}</h3>
                      <p className="text-muted-foreground">{selectedIncident.institution} • {selectedIncident.type}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Date de l'incident</p>
                        <p>{format(parseISO(selectedIncident.date_incident), 'dd MMMM yyyy', { locale: fr })}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Score / Confiance</p>
                        <p>{selectedIncident.score} points • {selectedIncident.confidence_level || 'N/A'}%</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Dysfonctionnement</p>
                      <p className="text-foreground bg-muted/50 p-3 rounded-md">{selectedIncident.dysfonctionnement}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Faits constatés</p>
                      <p className="text-foreground bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{selectedIncident.faits}</p>
                    </div>

                    {selectedIncident.rejection_reason && (
                      <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md">
                        <p className="text-sm font-medium text-destructive mb-1">Raison du rejet</p>
                        <p className="text-destructive">{selectedIncident.rejection_reason}</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="citations" className="mt-4">
                    <div className="space-y-4">
                      {selectedIncident?.email_source_id && (
                        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <Mail className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Email source:</span>
                          <EmailLink 
                            emailId={selectedIncident.email_source_id} 
                            label="Voir l'email complet"
                            variant="link"
                            showIcon
                            tooltip="Ouvrir l'email source de cet incident"
                          />
                        </div>
                      )}
                      {emailCitations.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          Aucune citation email disponible
                        </p>
                      ) : (
                        emailCitations.map((email: any) => (
                          <Card key={email.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{email.subject}</span>
                                </div>
                                <EmailLink 
                                  emailId={email.id} 
                                  label="Ouvrir"
                                  variant="outline"
                                  size="sm"
                                  showIcon
                                />
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                De: {email.sender} • {format(parseISO(email.received_at), 'dd/MM/yyyy HH:mm')}
                              </p>
                              <div className="bg-muted/50 p-3 rounded-md">
                                <div className="flex items-start gap-2">
                                  <Quote className="h-4 w-4 text-primary mt-1 shrink-0" />
                                  <p className="text-sm italic line-clamp-6">{email.body}</p>
                                </div>
                              </div>
                              {email.ai_analysis?.citations && (
                                <div className="mt-3 space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground">Citations extraites:</p>
                                  {(email.ai_analysis.citations as string[]).map((citation, idx) => (
                                    <div key={idx} className="flex items-start gap-2 bg-primary/5 p-2 rounded text-sm">
                                      <Shield className="h-3 w-3 text-primary mt-1 shrink-0" />
                                      <span>"{citation}"</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="attachments" className="mt-4">
                    <div className="space-y-4">
                      {attachments.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          Aucune pièce jointe associée
                        </p>
                      ) : (
                        attachments.map((att: any) => (
                          <Card key={att.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Paperclip className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{att.filename}</span>
                                <Badge variant="outline" className="text-xs">{att.mime_type}</Badge>
                              </div>
                              
                              {att.ai_analysis && (
                                <div className="space-y-2 mt-3">
                                  {att.ai_analysis.summary && (
                                    <p className="text-sm text-muted-foreground">{att.ai_analysis.summary}</p>
                                  )}
                                  
                                  {att.ai_analysis.problems_detected && att.ai_analysis.problems_detected.length > 0 && (
                                    <div className="bg-destructive/10 p-2 rounded">
                                      <p className="text-xs font-medium text-destructive mb-1">Problèmes détectés:</p>
                                      <ul className="text-xs text-destructive space-y-1">
                                        {att.ai_analysis.problems_detected.map((p: any, idx: number) => (
                                          <li key={idx}>• {typeof p === 'string' ? p : p.issue}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {att.ai_analysis.exact_citations && att.ai_analysis.exact_citations.length > 0 && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">Citations du document:</p>
                                      {att.ai_analysis.exact_citations.map((c: string, idx: number) => (
                                        <div key={idx} className="flex items-start gap-2 bg-primary/5 p-2 rounded text-xs">
                                          <Quote className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                                          <span>"{c}"</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {att.extracted_text && (
                                <details className="mt-2">
                                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                    Voir le texte extrait
                                  </summary>
                                  <pre className="text-xs bg-muted/50 p-2 rounded mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap">
                                    {att.extracted_text.slice(0, 2000)}
                                    {att.extracted_text.length > 2000 && '...'}
                                  </pre>
                                </details>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter className="gap-2 mt-4">
                  {!selectedIncident.validated_at && !selectedIncident.rejection_reason && (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={() => setRejectDialogOpen(true)}
                        disabled={rejectMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rejeter
                      </Button>
                      <Button 
                        onClick={() => validateMutation.mutate(selectedIncident.id)}
                        disabled={validateMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Valider
                      </Button>
                    </>
                  )}
                  {selectedIncident.validated_at && !selectedIncident.transmis_jp && (
                    <Button 
                      onClick={() => transmitMutation.mutate(selectedIncident.id)}
                      disabled={transmitMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Transmettre au Juge de Paix
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeter l'incident</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Veuillez indiquer la raison du rejet de cet incident.
              </p>
              <Textarea
                placeholder="Raison du rejet..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                variant="destructive"
                onClick={() => selectedIncident && rejectMutation.mutate({ 
                  incidentId: selectedIncident.id, 
                  reason: rejectionReason 
                })}
                disabled={!rejectionReason.trim() || rejectMutation.isPending}
              >
                Confirmer le rejet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
