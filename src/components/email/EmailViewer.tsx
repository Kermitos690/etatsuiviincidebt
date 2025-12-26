import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Mail, 
  Calendar, 
  User, 
  Users, 
  Volume2, 
  VolumeX, 
  ChevronDown, 
  ChevronUp,
  ExternalLink,
  Loader2,
  MessageSquare,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Email {
  id: string;
  subject: string;
  sender: string;
  recipient?: string;
  body: string;
  received_at: string;
  gmail_thread_id?: string;
  is_sent?: boolean;
}

interface EmailViewerProps {
  emailId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailViewer({ emailId, open, onOpenChange }: EmailViewerProps) {
  const [email, setEmail] = useState<Email | null>(null);
  const [threadEmails, setThreadEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (emailId && open) {
      fetchEmailAndThread(emailId);
    }
    return () => {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    };
  }, [emailId, open]);

  const fetchEmailAndThread = async (id: string) => {
    setLoading(true);
    try {
      // Fetch main email
      const { data: emailData, error } = await supabase
        .from('emails')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setEmail(emailData as Email);
      setExpandedEmails(new Set([id]));

      // Fetch thread if exists
      if (emailData?.gmail_thread_id) {
        const { data: threadData } = await supabase
          .from('emails')
          .select('*')
          .eq('gmail_thread_id', emailData.gmail_thread_id)
          .order('received_at', { ascending: true });

        if (threadData && threadData.length > 1) {
          setThreadEmails(threadData as Email[]);
          setShowThread(true);
        } else {
          setThreadEmails([]);
        }
      } else {
        setThreadEmails([]);
      }
    } catch (error) {
      console.error('Error fetching email:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEmailExpand = (id: string) => {
    setExpandedEmails(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const speakText = (text: string) => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 1;
    utterance.pitch = 1;
    
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const speakEmail = (emailToSpeak: Email) => {
    const text = `
      De: ${emailToSpeak.sender}.
      Sujet: ${emailToSpeak.subject}.
      Date: ${format(new Date(emailToSpeak.received_at), "d MMMM yyyy à HH'h'mm", { locale: fr })}.
      Message: ${emailToSpeak.body}
    `;
    speakText(text);
  };

  const speakAllThread = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const allText = threadEmails.map(e => `
      De: ${e.sender}.
      Date: ${format(new Date(e.received_at), "d MMMM yyyy", { locale: fr })}.
      ${e.body}
    `).join('\n\nEmail suivant:\n\n');

    speakText(`Lecture de la discussion complète. ${threadEmails.length} emails.\n\n${allText}`);
  };

  const handleClose = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {loading ? 'Chargement...' : email?.subject || 'Email'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : email ? (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {/* Email Header */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">De:</span>
                        <span className="text-sm">{email.sender}</span>
                        {email.is_sent && (
                          <Badge variant="outline" className="text-xs">Envoyé</Badge>
                        )}
                      </div>
                      {email.recipient && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">À:</span>
                          <span className="text-sm">{email.recipient}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Date:</span>
                        <span className="text-sm">
                          {format(new Date(email.received_at), "d MMMM yyyy à HH:mm", { locale: fr })}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant={speaking ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => speakEmail(email)}
                    >
                      {speaking ? (
                        <>
                          <VolumeX className="h-4 w-4 mr-2" />
                          Arrêter
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-4 w-4 mr-2" />
                          Écouter
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Email Body */}
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {email.body}
                  </p>
                </CardContent>
              </Card>

              {/* Thread History */}
              {threadEmails.length > 1 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-medium">
                          Historique de la discussion ({threadEmails.length} emails)
                        </h3>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={speaking ? "destructive" : "secondary"}
                          size="sm"
                          onClick={speakAllThread}
                        >
                          {speaking ? (
                            <>
                              <VolumeX className="h-4 w-4 mr-2" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-4 w-4 mr-2" />
                              Tout écouter
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowThread(!showThread)}
                        >
                          {showThread ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-2" />
                              Masquer
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-2" />
                              Afficher
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {showThread && (
                      <div className="space-y-3">
                        {threadEmails.map((threadEmail, index) => (
                          <Card 
                            key={threadEmail.id}
                            className={cn(
                              "transition-all",
                              threadEmail.id === email.id && "ring-2 ring-primary"
                            )}
                          >
                            <CardContent className="pt-4">
                              <div 
                                className="flex items-start justify-between gap-4 cursor-pointer"
                                onClick={() => toggleEmailExpand(threadEmail.id)}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                                    {index + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium text-sm truncate">
                                        {threadEmail.sender}
                                      </span>
                                      {threadEmail.is_sent && (
                                        <Badge variant="outline" className="text-xs">Envoyé</Badge>
                                      )}
                                      {threadEmail.id === email.id && (
                                        <Badge variant="default" className="text-xs">Actuel</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      {format(new Date(threadEmail.received_at), "d MMM yyyy HH:mm", { locale: fr })}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      speakEmail(threadEmail);
                                    }}
                                  >
                                    <Volume2 className="h-4 w-4" />
                                  </Button>
                                  {expandedEmails.has(threadEmail.id) ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                              
                              {expandedEmails.has(threadEmail.id) && (
                                <>
                                  <Separator className="my-3" />
                                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                    {threadEmail.body}
                                  </p>
                                </>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Email non trouvé
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
