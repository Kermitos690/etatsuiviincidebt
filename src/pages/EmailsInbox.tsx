import { useState, useEffect } from 'react';
import { Mail, Sparkles, Check, X, RefreshCw, AlertTriangle, ArrowRight, Clock, Brain } from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Email {
  id: string;
  subject: string;
  sender: string;
  body: string;
  received_at: string;
  processed: boolean;
  ai_analysis: {
    isIncident: boolean;
    confidence: number;
    suggestedTitle: string;
    suggestedFacts: string;
    suggestedDysfunction: string;
    suggestedInstitution: string;
    suggestedType: string;
    suggestedGravity: string;
    summary: string;
  } | null;
  incident_id: string | null;
  created_at: string;
}

export default function EmailsInbox() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const navigate = useNavigate();

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/receive-email`;

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .order('received_at', { ascending: false });

      if (error) throw error;
      setEmails((data || []) as unknown as Email[]);
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast.error('Erreur lors du chargement des emails');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('emails-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emails' }, () => {
        fetchEmails();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createIncidentFromEmail = async (email: Email) => {
    if (!email.ai_analysis) {
      toast.error('Pas d\'analyse IA disponible');
      return;
    }

    const analysis = email.ai_analysis;

    // Navigate to new incident form with pre-filled data
    navigate('/nouveau', { 
      state: { 
        prefillData: {
          titre: analysis.suggestedTitle,
          faits: analysis.suggestedFacts,
          dysfonctionnement: analysis.suggestedDysfunction,
          institution: analysis.suggestedInstitution,
          type: analysis.suggestedType,
          gravite: analysis.suggestedGravity,
          emailSourceId: email.id
        }
      }
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'from-emerald-400 to-emerald-600';
    if (confidence >= 60) return 'from-amber-400 to-orange-500';
    return 'from-red-400 to-red-600';
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <PageHeader 
          title="Boîte de réception" 
          description="Emails reçus et analysés par l'IA"
          icon={<Mail className="h-7 w-7 text-white" />}
          actions={
            <Button onClick={fetchEmails} variant="glass" disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Actualiser
            </Button>
          }
        />

        {/* Webhook Configuration */}
        <div className="glass-card p-6 mb-6 animate-scale-in">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-primary shadow-glow-sm">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Configuration Zapier</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Pour recevoir automatiquement vos emails, configurez Zapier :
              </p>
              <ol className="text-sm text-muted-foreground space-y-2 mb-4">
                <li>1. Créez un Zap avec le trigger "Email by Zapier"</li>
                <li>2. Ajoutez une action "Webhooks by Zapier" → POST</li>
                <li>3. Utilisez cette URL webhook :</li>
              </ol>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-2 bg-secondary/50 rounded-lg text-xs break-all font-mono">
                  {webhookUrl}
                </code>
                <Button 
                  variant="glass" 
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    toast.success('URL copiée !');
                  }}
                >
                  Copier
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Body JSON : {`{ "subject": "{{subject}}", "sender": "{{from}}", "body": "{{body_plain}}" }`}
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Email List */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Emails reçus ({emails.length})</h3>
            
            {loading ? (
              <div className="glass-card p-8 text-center animate-pulse">
                <RefreshCw className="h-8 w-8 mx-auto text-primary animate-spin" />
                <p className="text-muted-foreground mt-4">Chargement...</p>
              </div>
            ) : emails.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-primary/10 flex items-center justify-center mx-auto mb-4 animate-float">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <p className="text-muted-foreground">Aucun email reçu</p>
                <p className="text-xs text-muted-foreground mt-2">Configurez Zapier pour commencer</p>
              </div>
            ) : (
              emails.map((email, index) => (
                <div
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={cn(
                    "glass-card p-4 cursor-pointer transition-all duration-200 animate-scale-in",
                    selectedEmail?.id === email.id && "ring-2 ring-primary shadow-glow"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {email.ai_analysis?.isIncident ? (
                          <Badge className="bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Incident
                          </Badge>
                        ) : email.processed ? (
                          <Badge className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Traité
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            En attente
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-medium truncate">{email.subject}</h4>
                      <p className="text-sm text-muted-foreground truncate">{email.sender}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(email.received_at)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Email Detail & AI Analysis */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Détail & Analyse IA</h3>
            
            {selectedEmail ? (
              <div className="space-y-4 animate-scale-in">
                {/* Email Content */}
                <div className="glass-card p-6">
                  <h4 className="font-semibold mb-2">{selectedEmail.subject}</h4>
                  <p className="text-sm text-muted-foreground mb-4">De : {selectedEmail.sender}</p>
                  <div className="bg-secondary/30 rounded-xl p-4 max-h-48 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">{selectedEmail.body}</p>
                  </div>
                </div>

                {/* AI Analysis */}
                {selectedEmail.ai_analysis ? (
                  <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-xl bg-gradient-secondary shadow-glow-sm">
                        <Brain className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Analyse IA</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">Confiance :</span>
                          <span className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r text-white",
                            getConfidenceColor(selectedEmail.ai_analysis.confidence)
                          )}>
                            {selectedEmail.ai_analysis.confidence}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedEmail.ai_analysis.isIncident ? (
                      <>
                        <div className="space-y-3 mb-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Titre suggéré</p>
                            <p className="font-medium">{selectedEmail.ai_analysis.suggestedTitle}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Résumé</p>
                            <p className="text-sm">{selectedEmail.ai_analysis.summary}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Institution</p>
                              <p className="text-sm font-medium">{selectedEmail.ai_analysis.suggestedInstitution}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Gravité</p>
                              <p className="text-sm font-medium">{selectedEmail.ai_analysis.suggestedGravity}</p>
                            </div>
                          </div>
                        </div>

                        <Button 
                          className="w-full"
                          onClick={() => createIncidentFromEmail(selectedEmail)}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Créer l'incident
                        </Button>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          L'IA n'a pas détecté d'incident dans cet email
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="glass-card p-6 text-center">
                    <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Analyse IA en attente
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-secondary/10 flex items-center justify-center mx-auto mb-4">
                  <Brain className="h-8 w-8 text-accent" />
                </div>
                <p className="text-muted-foreground">
                  Sélectionnez un email pour voir l'analyse
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
