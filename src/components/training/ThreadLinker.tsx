import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Link2, 
  Unlink, 
  Loader2, 
  RefreshCw, 
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  HelpCircle,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ThreadBreak {
  id: string;
  thread_id: string;
  email_id: string;
  break_type: string;
  detected_at: string;
  questions_unanswered: string[];
  days_gap: number;
  continuation_suggested_id: string | null;
  is_confirmed: boolean;
  is_resolved: boolean;
  notes: string | null;
}

interface ThreadLink {
  id: string;
  primary_thread_id: string;
  linked_email_ids: string[];
  link_reason: string | null;
  link_type: string;
  ai_suggested: boolean;
  user_confirmed: boolean;
  created_at: string;
}

interface Email {
  id: string;
  subject: string;
  sender: string;
  received_at: string;
  gmail_thread_id: string | null;
  body: string;
}

export function ThreadLinker() {
  const [breaks, setBreaks] = useState<ThreadBreak[]>([]);
  const [links, setLinks] = useState<ThreadLink[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedBreak, setSelectedBreak] = useState<ThreadBreak | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [linkReason, setLinkReason] = useState('');
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [breaksRes, linksRes, emailsRes] = await Promise.all([
        supabase
          .from('thread_break_detections')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_resolved', false)
          .order('detected_at', { ascending: false }),
        supabase
          .from('email_thread_links')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('emails')
          .select('id, subject, sender, received_at, gmail_thread_id, body')
          .eq('user_id', user.id)
          .order('received_at', { ascending: false })
          .limit(100)
      ]);

      if (breaksRes.error) throw breaksRes.error;
      if (linksRes.error) throw linksRes.error;
      if (emailsRes.error) throw emailsRes.error;

      setBreaks(breaksRes.data || []);
      setLinks(linksRes.data || []);
      setEmails(emailsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const detectBreaks = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-thread-breaks');
      
      if (error) throw error;
      
      toast.success(`${data.detected || 0} ruptures détectées`);
      fetchData();
    } catch (error) {
      console.error('Error detecting breaks:', error);
      toast.error('Erreur lors de l\'analyse');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const suggestLinks = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('link-threads');
      
      if (error) throw error;
      
      toast.success(`${data.suggested || 0} liaisons suggérées`);
      fetchData();
    } catch (error) {
      console.error('Error suggesting links:', error);
      toast.error('Erreur lors de l\'analyse');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resolveBreak = async (breakItem: ThreadBreak, resolved: boolean) => {
    try {
      const { error } = await supabase
        .from('thread_break_detections')
        .update({ is_resolved: resolved })
        .eq('id', breakItem.id);

      if (error) throw error;
      
      toast.success(resolved ? 'Rupture résolue' : 'Rupture rouverte');
      fetchData();
    } catch (error) {
      console.error('Error resolving break:', error);
      toast.error('Erreur');
    }
  };

  const confirmLink = async (link: ThreadLink) => {
    try {
      const { error } = await supabase
        .from('email_thread_links')
        .update({ user_confirmed: true })
        .eq('id', link.id);

      if (error) throw error;
      
      toast.success('Liaison confirmée');
      fetchData();
    } catch (error) {
      console.error('Error confirming link:', error);
      toast.error('Erreur');
    }
  };

  const deleteLink = async (link: ThreadLink) => {
    if (!confirm('Supprimer cette liaison ?')) return;
    
    try {
      const { error } = await supabase
        .from('email_thread_links')
        .delete()
        .eq('id', link.id);

      if (error) throw error;
      
      toast.success('Liaison supprimée');
      fetchData();
    } catch (error) {
      console.error('Error deleting link:', error);
      toast.error('Erreur');
    }
  };

  const createManualLink = async () => {
    if (selectedEmails.length < 2) {
      toast.error('Sélectionnez au moins 2 emails');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const primaryEmail = emails.find(e => e.id === selectedEmails[0]);
      
      const { error } = await supabase
        .from('email_thread_links')
        .insert({
          user_id: user.id,
          primary_thread_id: primaryEmail?.gmail_thread_id || selectedEmails[0],
          linked_email_ids: selectedEmails,
          link_reason: linkReason || null,
          link_type: 'manual',
          ai_suggested: false,
          user_confirmed: true
        });

      if (error) throw error;
      
      toast.success('Liaison créée');
      setLinkDialogOpen(false);
      setSelectedEmails([]);
      setLinkReason('');
      fetchData();
    } catch (error) {
      console.error('Error creating link:', error);
      toast.error('Erreur');
    }
  };

  const getBreakTypeLabel = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      'topic_change': { label: 'Changement de sujet', color: 'bg-orange-500' },
      'unanswered': { label: 'Question sans réponse', color: 'bg-red-500' },
      'new_thread_same_topic': { label: 'Nouveau thread même sujet', color: 'bg-blue-500' },
      'temporal_gap': { label: 'Gap temporel', color: 'bg-yellow-500' },
    };
    return types[type] || { label: type, color: 'bg-gray-500' };
  };

  const getLinkTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'continuation': 'Suite de conversation',
      'related': 'Emails liés',
      'followup': 'Suivi',
      'split': 'Thread divisé',
      'manual': 'Lien manuel',
    };
    return types[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={detectBreaks} disabled={isAnalyzing} className="gap-2">
          {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
          Détecter les ruptures
        </Button>
        <Button onClick={suggestLinks} disabled={isAnalyzing} variant="secondary" className="gap-2">
          {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Suggérer des liaisons
        </Button>
        <Button variant="outline" onClick={() => setLinkDialogOpen(true)} className="gap-2">
          <Link2 className="h-4 w-4" />
          Lier manuellement
        </Button>
        <Button variant="ghost" size="icon" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-500">{breaks.length}</div>
            <div className="text-sm text-muted-foreground">Ruptures à traiter</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-500">{links.length}</div>
            <div className="text-sm text-muted-foreground">Liaisons créées</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">
              {links.filter(l => l.user_confirmed).length}
            </div>
            <div className="text-sm text-muted-foreground">Confirmées</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-500">
              {links.filter(l => l.ai_suggested && !l.user_confirmed).length}
            </div>
            <div className="text-sm text-muted-foreground">À valider</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="breaks">
        <TabsList>
          <TabsTrigger value="breaks" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Ruptures ({breaks.length})
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-2">
            <Link2 className="h-4 w-4" />
            Liaisons ({links.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="breaks" className="space-y-4 mt-4">
          {breaks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Aucune rupture de conversation détectée</p>
              <p className="text-sm mt-2">Cliquez sur "Détecter les ruptures" pour analyser</p>
            </div>
          ) : (
            breaks.map(breakItem => {
              const typeInfo = getBreakTypeLabel(breakItem.break_type);
              
              return (
                <Card key={breakItem.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                        <CardTitle className="text-sm font-mono">
                          Thread: {breakItem.thread_id.slice(0, 20)}...
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(breakItem.detected_at), 'dd/MM/yyyy', { locale: fr })}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {breakItem.days_gap > 0 && (
                      <p className="text-sm">
                        <span className="font-medium">Gap temporel:</span> {breakItem.days_gap} jours
                      </p>
                    )}
                    
                    {breakItem.questions_unanswered.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium flex items-center gap-1">
                          <HelpCircle className="h-4 w-4 text-red-500" />
                          Questions sans réponse:
                        </p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                          {breakItem.questions_unanswered.map((q, i) => (
                            <li key={i} className="truncate">{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {breakItem.notes && (
                      <p className="text-sm text-muted-foreground italic">
                        {breakItem.notes}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button 
                        size="sm" 
                        onClick={() => resolveBreak(breakItem, true)}
                        className="gap-1"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Marquer résolu
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedBreak(breakItem);
                          setLinkDialogOpen(true);
                        }}
                        className="gap-1"
                      >
                        <Link2 className="h-3 w-3" />
                        Créer liaison
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="links" className="space-y-4 mt-4">
          {links.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Link2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Aucune liaison de thread créée</p>
            </div>
          ) : (
            links.map(link => (
              <Card key={link.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={link.user_confirmed ? 'default' : 'outline'}>
                          {getLinkTypeLabel(link.link_type)}
                        </Badge>
                        {link.ai_suggested && !link.user_confirmed && (
                          <Badge variant="secondary" className="gap-1">
                            <Sparkles className="h-3 w-3" />
                            Suggestion IA
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-sm font-mono">
                        {link.primary_thread_id.slice(0, 20)}...
                      </CardTitle>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {link.linked_email_ids.length} emails
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {link.link_reason && (
                    <p className="text-sm text-muted-foreground">
                      {link.link_reason}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t">
                    {!link.user_confirmed && (
                      <Button size="sm" onClick={() => confirmLink(link)} className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Confirmer
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => deleteLink(link)} className="gap-1">
                      <Unlink className="h-3 w-3" />
                      Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Manual Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lier des emails</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sélectionnez les emails qui font partie de la même conversation :
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-2">
              {emails.map(email => (
                <div 
                  key={email.id}
                  className={`flex items-start gap-3 p-2 rounded-md hover:bg-accent cursor-pointer ${
                    selectedEmails.includes(email.id) ? 'bg-accent' : ''
                  }`}
                  onClick={() => {
                    setSelectedEmails(prev => 
                      prev.includes(email.id)
                        ? prev.filter(id => id !== email.id)
                        : [...prev, email.id]
                    );
                  }}
                >
                  <Checkbox 
                    checked={selectedEmails.includes(email.id)}
                    onCheckedChange={(checked) => {
                      setSelectedEmails(prev => 
                        checked 
                          ? [...prev, email.id]
                          : prev.filter(id => id !== email.id)
                      );
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate">{email.subject}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {email.sender} • {format(new Date(email.received_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </div>
                  </div>
                  {selectedEmails.indexOf(email.id) !== -1 && (
                    <Badge variant="secondary" className="shrink-0">
                      #{selectedEmails.indexOf(email.id) + 1}
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {selectedEmails.length >= 2 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
                {selectedEmails.length} emails sélectionnés pour liaison
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Raison de la liaison (optionnel)</label>
              <Textarea
                value={linkReason}
                onChange={(e) => setLinkReason(e.target.value)}
                placeholder="Pourquoi ces emails sont-ils liés ?"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setLinkDialogOpen(false);
              setSelectedEmails([]);
              setLinkReason('');
              setSelectedBreak(null);
            }}>
              Annuler
            </Button>
            <Button onClick={createManualLink} disabled={selectedEmails.length < 2}>
              Créer la liaison
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
