import { useParams, Link, useNavigate } from 'react-router-dom';
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
  Link as LinkIcon
} from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { PriorityBadge, StatusBadge } from '@/components/common';
import { useIncidentStore } from '@/stores/incidentStore';
import { formatDate, formatDateTime } from '@/config/appConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

const proofIcons = {
  email: Mail,
  screenshot: Image,
  document: FileIcon,
  link: LinkIcon
};

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { incidents, updateIncident } = useIncidentStore();
  
  const incident = incidents.find(i => i.id === id);

  if (!incident) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-2">Incident non trouvé</h2>
            <Button variant="outline" asChild>
              <Link to="/incidents">Retour à la liste</Link>
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const markTransmisJP = () => {
    updateIncident(incident.id, { 
      transmisJP: true, 
      dateTransmissionJP: new Date().toISOString(),
      statut: 'Transmis'
    });
  };

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>

        <PageHeader 
          title={`Incident #${incident.numero}`}
          description={incident.titre}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to={`/incidents/${incident.id}/edit`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </Link>
              </Button>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              {!incident.transmisJP && (
                <Button onClick={markTransmisJP}>
                  <Send className="h-4 w-4 mr-2" />
                  Transmettre JP
                </Button>
              )}
            </div>
          }
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Date incident</p>
                  <p className="font-medium">{formatDate(incident.dateIncident)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Institution</p>
                  <p className="font-medium">{incident.institution}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Tag className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="font-medium">{incident.type}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Gravité</p>
                  <p className="font-medium">{incident.gravite}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status & Priority */}
        <div className="flex items-center gap-4 mb-6">
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
          <TabsList>
            <TabsTrigger value="resume">Résumé</TabsTrigger>
            <TabsTrigger value="preuves">Preuves ({incident.preuves.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="resume">
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Faits constatés</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {incident.faits || 'Non renseigné'}
                  </p>
                </div>
                <Separator />
                <div>
                  <h3 className="font-medium mb-2">Dysfonctionnement</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">
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
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="font-medium">{preuve.label}</p>
                            <p className="text-xs text-muted-foreground capitalize">{preuve.type}</p>
                          </div>
                          {preuve.url && (
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
        </Tabs>
      </div>
    </AppLayout>
  );
}
