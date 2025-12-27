import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Mail,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  Brain,
  Link2,
  Eye,
  TrendingUp,
  Building2,
  RefreshCw,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EmailLink } from '@/components/email';
import { useNavigate } from 'react-router-dom';
import { FullReanalyzeDialog } from '@/components/analysis/FullReanalyzeDialog';
import { useGmailFilters } from '@/hooks/useGmailFilters';
import { isEmailRelevant } from '@/utils/emailFilters';

interface AIAnalysis {
  is_incident?: boolean;
  confidence?: number;
  title?: string;
  type?: string;
  severity?: string;
  institution?: string;
  summary?: string;
  facts?: string;
  dysfunction?: string;
  score?: number;
  legal_references?: string[];
  correlations?: {
    institution: string;
    similar_count: number;
  }[];
}

interface Email {
  id: string;
  subject: string;
  sender: string;
  received_at: string;
  ai_analysis: AIAnalysis | null;
  incident_id: string | null;
  processed: boolean;
  [key: string]: unknown;
}

interface Incident {
  id: string;
  numero: number;
  titre: string;
  gravite: string;
  statut: string;
}

export default function EmailsAnalyzed() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [linkedIncident, setLinkedIncident] = useState<Incident | null>(null);
  const [showReanalyze, setShowReanalyze] = useState(false);
  const [showAllEmails, setShowAllEmails] = useState(false);
  const { data: gmailFilters } = useGmailFilters();
  const queryClient = useQueryClient();

  // Fetch analyzed emails
  const { data: emails, isLoading } = useQuery({
    queryKey: ['analyzed-emails'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .not('ai_analysis', 'is', null)
        .order('received_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        ai_analysis: item.ai_analysis as AIAnalysis | null
      })) as Email[];
    }
  });

  // Fetch incident when email is selected
  const fetchLinkedIncident = async (incidentId: string) => {
    const { data } = await supabase
      .from('incidents')
      .select('id, numero, titre, gravite, statut')
      .eq('id', incidentId)
      .maybeSingle();
    
    setLinkedIncident(data);
  };

  const handleEmailClick = async (email: Email) => {
    setSelectedEmail(email);
    if (email.incident_id) {
      await fetchLinkedIncident(email.incident_id);
    } else {
      setLinkedIncident(null);
    }
  };

  // Filter emails
  const filteredEmails = emails?.filter(email => {
    const relevant = showAllEmails || !gmailFilters ? true : isEmailRelevant(email as any, gmailFilters);
    if (!relevant) return false;

    const searchLower = searchTerm.toLowerCase();
    return (
      email.subject.toLowerCase().includes(searchLower) ||
      email.sender.toLowerCase().includes(searchLower) ||
      email.ai_analysis?.institution?.toLowerCase().includes(searchLower) ||
      email.ai_analysis?.type?.toLowerCase().includes(searchLower)
    );
  });

  // Stats
  const stats = {
    total: emails?.length || 0,
    incidents: emails?.filter(e => e.ai_analysis?.is_incident).length || 0,
    highConfidence: emails?.filter(e => (e.ai_analysis?.confidence || 0) >= 80).length || 0,
    linked: emails?.filter(e => e.incident_id).length || 0
  };

  const getSeverityColor = (severity: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (severity?.toLowerCase()) {
      case 'critique': return 'destructive';
      case 'majeure': return 'secondary';
      case 'modérée': return 'secondary';
      default: return 'outline';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-500';
    if (confidence >= 60) return 'text-yellow-500';
    return 'text-orange-500';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Emails Analysés"
            description="Visualisez les emails analysés par l'IA avec leurs scores et incidents liés"
          />
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
              <Button
                variant={!showAllEmails ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setShowAllEmails(false)}
                className="h-8"
                title="Affiche uniquement les emails correspondant à vos domaines et mots-clés"
              >
                <Filter className="h-4 w-4 mr-1" />
                Pertinents
              </Button>
              <Button
                variant={showAllEmails ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setShowAllEmails(true)}
                className="h-8"
                title="Affiche tous les emails synchronisés (peut inclure du spam)"
              >
                Tous
              </Button>
            </div>

            <Button onClick={() => setShowReanalyze(true)} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Réanalyse Complète
            </Button>
          </div>
        </div>

        <FullReanalyzeDialog 
          open={showReanalyze} 
          onOpenChange={setShowReanalyze}
          onComplete={() => queryClient.invalidateQueries({ queryKey: ['analyzed-emails'] })}
        />
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total analysés</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Incidents détectés</p>
                  <p className="text-2xl font-bold">{stats.incidents}</p>
                </div>
                <div className="p-3 rounded-xl bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Haute confiance</p>
                  <p className="text-2xl font-bold">{stats.highConfidence}</p>
                </div>
                <div className="p-3 rounded-xl bg-green-500/10">
                  <Brain className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Liés à incidents</p>
                  <p className="text-2xl font-bold">{stats.linked}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <Link2 className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par sujet, expéditeur, institution, type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Emails Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Emails Analysés ({filteredEmails?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredEmails?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun email analysé trouvé</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Sujet</TableHead>
                    <TableHead>Expéditeur</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Confiance</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmails?.map((email) => (
                    <TableRow 
                      key={email.id}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(email.received_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium">
                        {email.subject}
                      </TableCell>
                      <TableCell className="text-sm">
                        {email.sender}
                      </TableCell>
                      <TableCell>
                        {email.ai_analysis?.institution && (
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <Building2 className="h-3 w-3" />
                            {email.ai_analysis.institution}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {email.ai_analysis?.type && (
                          <Badge variant="secondary">
                            {email.ai_analysis.type}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={email.ai_analysis?.confidence || 0} 
                            className="w-16 h-2"
                          />
                          <span className={`text-sm font-medium ${getConfidenceColor(email.ai_analysis?.confidence || 0)}`}>
                            {email.ai_analysis?.confidence || 0}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{email.ai_analysis?.score || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {email.ai_analysis?.is_incident ? (
                          email.incident_id ? (
                            <Badge variant="default" className="flex items-center gap-1 w-fit">
                              <CheckCircle className="h-3 w-3" />
                              Lié
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              <AlertTriangle className="h-3 w-3" />
                              Incident
                            </Badge>
                          )
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <Clock className="h-3 w-3" />
                            Normal
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <EmailLink
                            emailId={email.id}
                            label=""
                            variant="cta"
                            size="icon"
                            showIcon
                            tooltip="Voir l'email complet"
                          />
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEmailClick(email)}
                            title="Voir l'analyse"
                          >
                            <Brain className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Email Detail Dialog */}
        <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Analyse IA de l'email
              </DialogTitle>
            </DialogHeader>

            {selectedEmail && (
              <div className="space-y-6">
                {/* Email Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Informations email</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sujet:</span>
                      <span className="font-medium">{selectedEmail.subject}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expéditeur:</span>
                      <span>{selectedEmail.sender}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span>{format(new Date(selectedEmail.received_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Analysis */}
                {selectedEmail.ai_analysis && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Résultat de l'analyse</CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Confiance:</span>
                          <Badge className={getConfidenceColor(selectedEmail.ai_analysis.confidence)}>
                            {selectedEmail.ai_analysis.confidence}%
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Titre détecté</p>
                          <p className="font-medium">{selectedEmail.ai_analysis.title}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Institution</p>
                          <Badge variant="outline">{selectedEmail.ai_analysis.institution}</Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Type</p>
                          <Badge variant="secondary">{selectedEmail.ai_analysis.type}</Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Gravité</p>
                          <Badge variant={getSeverityColor(selectedEmail.ai_analysis.severity)}>
                            {selectedEmail.ai_analysis.severity}
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Résumé</p>
                        <p className="text-sm bg-muted/50 p-3 rounded-lg">
                          {selectedEmail.ai_analysis.summary}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Faits identifiés</p>
                        <p className="text-sm bg-muted/50 p-3 rounded-lg">
                          {selectedEmail.ai_analysis.facts}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Dysfonctionnement</p>
                        <p className="text-sm bg-muted/50 p-3 rounded-lg">
                          {selectedEmail.ai_analysis.dysfunction}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm text-muted-foreground">Score de gravité</span>
                        <div className="flex items-center gap-2">
                          <Progress value={selectedEmail.ai_analysis.score * 10} className="w-24 h-2" />
                          <span className="font-bold text-lg">{selectedEmail.ai_analysis.score}/10</span>
                        </div>
                      </div>

                      {selectedEmail.ai_analysis.legal_references && selectedEmail.ai_analysis.legal_references.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Références légales</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedEmail.ai_analysis.legal_references.map((ref, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {ref}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Linked Incident */}
                {linkedIncident && (
                  <Card className="border-primary/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        Incident lié
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">#{linkedIncident.numero} - {linkedIncident.titre}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={getSeverityColor(linkedIncident.gravite)}>
                              {linkedIncident.gravite}
                            </Badge>
                            <Badge variant="outline">{linkedIncident.statut}</Badge>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`/incidents/${linkedIncident.id}`, '_blank')}
                        >
                          Voir l'incident
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
