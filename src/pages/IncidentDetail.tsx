import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Pencil, 
  FileText, 
  Send, 
  Calendar, 
  Building, 
  Tag,
  AlertTriangle,
  ExternalLink,
  FileIcon,
  Mail,
  Image,
  Link as LinkIcon,
  Loader2,
  Volume2,
  MessageSquare,
  Download
} from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { PriorityBadge, StatusBadge } from '@/components/common';
import { useIncidentStore } from '@/stores/incidentStore';
import { formatDate, formatDateTime } from '@/config/appConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { EmailLink } from '@/components/email';
import { supabase } from '@/integrations/supabase/client';
import { EmailViewer } from '@/components/email';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { generateIncidentPDF } from '@/utils/generateIncidentPDF';

const proofIcons = {
  email: Mail,
  screenshot: Image,
  document: FileIcon,
  link: LinkIcon
};

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { incidents, updateIncident, loadFromSupabase, isLoading } = useIncidentStore();
  const [hasLoaded, setHasLoaded] = useState(false);
  const [sourceEmailId, setSourceEmailId] = useState<string | null>(null);
  const [relatedEmails, setRelatedEmails] = useState<any[]>([]);
  const [showEmailViewer, setShowEmailViewer] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  
  useEffect(() => {
    const load = async () => {
      await loadFromSupabase();
      setHasLoaded(true);
    };
    load();
  }, [loadFromSupabase]);

  // Fetch source email and related emails
  useEffect(() => {
    const fetchRelatedEmails = async () => {
      if (!id) return;
      
      const { data: incidentData } = await supabase
        .from('incidents')
        .select('email_source_id, gmail_references')
        .eq('id', id)
        .single();
      
      if (incidentData?.email_source_id) {
        setSourceEmailId(incidentData.email_source_id);
        
        // Fetch source email to get thread
        const { data: sourceEmail } = await supabase
          .from('emails')
          .select('*')
          .eq('id', incidentData.email_source_id)
          .single();
        
        if (sourceEmail?.gmail_thread_id) {
          const { data: threadEmails } = await supabase
            .from('emails')
            .select('*')
            .eq('gmail_thread_id', sourceEmail.gmail_thread_id)
            .order('received_at', { ascending: true });
          
          setRelatedEmails(threadEmails || []);
        } else {
          setRelatedEmails(sourceEmail ? [sourceEmail] : []);
        }
      }
    };
    
    fetchRelatedEmails();
  }, [id]);
  
  const incident = incidents.find(i => i.id === id);

  if (isLoading || !hasLoaded) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!incident) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-2">Incident non trouvé</h2>
            <p className="text-sm text-muted-foreground mb-4">ID: {id}</p>
            <Button variant="outline" asChild>
              <Link to="/incidents">Retour à la liste</Link>
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const speakText = (text: string) => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const speakIncident = () => {
    const text = `
      Incident numéro ${incident.numero}. ${incident.titre}.
      Date: ${formatDate(incident.dateIncident)}.
      Institution: ${incident.institution}.
      Type: ${incident.type}.
      Gravité: ${incident.gravite}.
      Faits constatés: ${incident.faits}.
      Dysfonctionnement: ${incident.dysfonctionnement}.
    `;
    speakText(text);
  };

  const markTransmisJP = () => {
    updateIncident(incident.id, { 
      transmisJP: true, 
      dateTransmissionJP: new Date().toISOString(),
      statut: 'Transmis'
    });
  };

  const exportPDF = async () => {
    setExportingPDF(true);
    try {
      await generateIncidentPDF({
        id: incident.id,
        numero: incident.numero,
        titre: incident.titre,
        dateIncident: incident.dateIncident,
        dateCreation: incident.dateCreation,
        institution: incident.institution,
        type: incident.type,
        gravite: incident.gravite,
        priorite: incident.priorite,
        score: incident.score,
        statut: incident.statut,
        faits: incident.faits,
        dysfonctionnement: incident.dysfonctionnement,
        transmisJP: incident.transmisJP,
        dateTransmissionJP: incident.dateTransmissionJP,
        preuves: incident.preuves.map(p => ({
          id: p.id,
          type: p.type,
          label: p.label,
          url: p.url,
        })),
      }, {
        includeProofs: true,
        includeLegalExplanations: true,
      });
      
      toast.success('PDF Premium généré avec bases légales');
    } catch (error) {
      console.error('Erreur export PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6">
        <div className="mb-4 md:mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-xl md:text-2xl font-semibold">
              Incident #{incident.numero}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              {incident.titre}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={speaking ? "destructive" : "outline"} 
              size="sm" 
              onClick={speakIncident}
            >
              <Volume2 className="h-4 w-4 mr-2" />
              {speaking ? 'Stop' : 'Écouter'}
            </Button>
            {sourceEmailId && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedEmailId(sourceEmailId);
                  setShowEmailViewer(true);
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email source
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to={`/incidents/${incident.id}/edit`}>
                <Pencil className="h-4 w-4 mr-2" />
                Modifier
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportPDF}
              disabled={exportingPDF}
            >
              {exportingPDF ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              PDF
            </Button>
            {!incident.transmisJP && (
              <Button size="sm" onClick={markTransmisJP}>
                <Send className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Transmettre JP</span>
                <span className="sm:hidden">JP</span>
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards - Responsive grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 md:gap-3">
                <Calendar className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium text-sm md:text-base truncate">{formatDate(incident.dateIncident)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 md:gap-3">
                <Building className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Institution</p>
                  <p className="font-medium text-sm md:text-base truncate">{incident.institution}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 md:gap-3">
                <Tag className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="font-medium text-sm md:text-base truncate">{incident.type}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 md:gap-3">
                <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Gravité</p>
                  <p className="font-medium text-sm md:text-base truncate">{incident.gravite}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status & Priority */}
        <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-6">
          <StatusBadge status={incident.statut} />
          <PriorityBadge 
            priority={incident.priorite} 
            score={incident.score}
            gravite={incident.gravite}
            type={incident.type}
          />
          {incident.transmisJP && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
              <Send className="h-3 w-3" />
              Transmis JP {incident.dateTransmissionJP && `le ${formatDate(incident.dateTransmissionJP)}`}
            </span>
          )}
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="resume" className="space-y-4">
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="resume" className="flex-1 md:flex-none">Résumé</TabsTrigger>
            <TabsTrigger value="preuves" className="flex-1 md:flex-none">
              Preuves ({incident.preuves.length})
            </TabsTrigger>
            {relatedEmails.length > 0 && (
              <TabsTrigger value="emails" className="flex-1 md:flex-none">
                <MessageSquare className="h-4 w-4 mr-1" />
                Emails ({relatedEmails.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="resume">
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Faits constatés</h3>
                  <p className="text-sm md:text-base text-muted-foreground whitespace-pre-wrap">
                    {incident.faits || 'Non renseigné'}
                  </p>
                </div>
                <Separator />
                <div>
                  <h3 className="font-medium mb-2">Dysfonctionnement</h3>
                  <p className="text-sm md:text-base text-muted-foreground whitespace-pre-wrap">
                    {incident.dysfonctionnement || 'Non renseigné'}
                  </p>
                </div>
                <Separator />
                <div className="text-xs text-muted-foreground">
                  Créé le {formatDateTime(incident.dateCreation)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preuves">
            <Card>
              <CardContent className="pt-6">
                {incident.preuves.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune preuve attachée
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incident.preuves.map((preuve) => {
                      const Icon = proofIcons[preuve.type] || FileIcon;
                      return (
                        <div 
                          key={preuve.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
                        >
                          <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{preuve.label}</p>
                            <p className="text-xs text-muted-foreground capitalize">{preuve.type}</p>
                          </div>
                          {preuve.type === 'email' && preuve.url && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedEmailId(preuve.url);
                                setShowEmailViewer(true);
                              }}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                          {preuve.url && preuve.type !== 'email' && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={preuve.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {relatedEmails.length > 0 && (
            <TabsContent value="emails">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Historique de la discussion
                    </h3>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const text = relatedEmails.map(e => 
                          `De: ${e.sender}. Date: ${format(new Date(e.received_at), 'd MMMM yyyy', { locale: fr })}. ${e.body}`
                        ).join('\n\nEmail suivant:\n\n');
                        
                        if (speaking) {
                          window.speechSynthesis.cancel();
                          setSpeaking(false);
                        } else {
                          speakText(`Discussion complète. ${relatedEmails.length} emails. ${text}`);
                        }
                      }}
                    >
                      <Volume2 className="h-4 w-4 mr-2" />
                      {speaking ? 'Stop' : 'Tout écouter'}
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {relatedEmails.map((email, index) => (
                      <Card 
                        key={email.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          setSelectedEmailId(email.id);
                          setShowEmailViewer(true);
                        }}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{email.sender}</span>
                                {email.is_sent && (
                                  <Badge variant="outline" className="text-xs">Envoyé</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(email.received_at), "d MMMM yyyy à HH:mm", { locale: fr })}
                              </p>
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {email.body}
                              </p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                speakText(`De: ${email.sender}. ${email.body}`);
                              }}
                            >
                              <Volume2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Email Viewer Dialog */}
        <EmailViewer 
          emailId={selectedEmailId} 
          open={showEmailViewer} 
          onOpenChange={setShowEmailViewer} 
        />
      </div>
    </AppLayout>
  );
}
