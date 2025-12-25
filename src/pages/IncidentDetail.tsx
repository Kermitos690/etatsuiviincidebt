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
import { Card, CardContent } from '@/components/ui/card';
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
        <div className="p-4 md:p-6">
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
            <Button variant="outline" size="sm" asChild>
              <Link to={`/incidents/${incident.id}/edit`}>
                <Pencil className="h-4 w-4 mr-2" />
                Modifier
              </Link>
            </Button>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
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
