import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Mail, Clock, User, Building, Quote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EmailFact {
  id: string;
  email_id: string;
  sender_name: string | null;
  sender_email: string | null;
  recipients: string[] | null;
  mentioned_persons: string[] | null;
  mentioned_institutions: string[] | null;
  mentioned_dates: string[] | null;
  key_phrases: string[] | null;
  action_items: string[] | null;
  sentiment: string | null;
  urgency_level: string | null;
  raw_citations: { text: string; context: string }[] | null;
  extracted_at: string;
  email?: {
    subject: string;
    body: string;
    received_at: string;
    sender: string;
  };
}

interface FactualTimelineProps {
  facts: EmailFact[];
}

export function FactualTimeline({ facts }: FactualTimelineProps) {
  // Group facts by date
  const groupedFacts = facts.reduce((acc, fact) => {
    const date = fact.email?.received_at 
      ? format(new Date(fact.email.received_at), 'yyyy-MM-dd')
      : format(new Date(fact.extracted_at), 'yyyy-MM-dd');
    
    if (!acc[date]) acc[date] = [];
    acc[date].push(fact);
    return acc;
  }, {} as Record<string, EmailFact[]>);

  const sortedDates = Object.keys(groupedFacts).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case 'negative': return 'destructive';
      case 'positive': return 'default';
      case 'mixed': return 'secondary';
      default: return 'outline';
    }
  };

  const getUrgencyColor = (urgency: string | null) => {
    switch (urgency) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      default: return 'bg-green-500';
    }
  };

  if (facts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">Aucun fait extrait</h3>
          <p className="text-sm text-muted-foreground">
            Cliquez sur "Extraire les faits" pour analyser vos emails
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Chronologie des faits
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">
            {sortedDates.map(date => (
              <div key={date} className="relative">
                {/* Date header */}
                <div className="sticky top-0 z-10 bg-background py-2">
                  <Badge variant="outline" className="text-sm font-medium">
                    {format(new Date(date), 'EEEE d MMMM yyyy', { locale: fr })}
                  </Badge>
                </div>

                {/* Facts for this date */}
                <div className="space-y-4 ml-4 border-l-2 border-muted pl-4">
                  {groupedFacts[date].map(fact => (
                    <div 
                      key={fact.id}
                      className="relative pb-4"
                    >
                      {/* Timeline dot */}
                      <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ${getUrgencyColor(fact.urgency_level)}`} />

                      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                        {/* Header */}
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {fact.sender_name || fact.sender_email || 'Expéditeur inconnu'}
                              </span>
                            </div>
                            {fact.email?.received_at && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {format(new Date(fact.email.received_at), 'HH:mm')}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {fact.sentiment && (
                              <Badge variant={getSentimentColor(fact.sentiment)} className="text-xs">
                                {fact.sentiment}
                              </Badge>
                            )}
                            {fact.urgency_level === 'high' && (
                              <Badge variant="destructive" className="text-xs">
                                Urgent
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Subject */}
                        {fact.email?.subject && (
                          <p className="font-medium text-sm">
                            {fact.email.subject}
                          </p>
                        )}

                        {/* Institutions mentioned */}
                        {fact.mentioned_institutions && fact.mentioned_institutions.length > 0 && (
                          <div className="flex items-center gap-2 text-xs">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            <div className="flex flex-wrap gap-1">
                              {fact.mentioned_institutions.map((inst, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {inst}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Key citations */}
                        {fact.raw_citations && fact.raw_citations.length > 0 && (
                          <div className="space-y-2">
                            {fact.raw_citations.slice(0, 2).map((citation, i) => (
                              <div 
                                key={i}
                                className="flex items-start gap-2 text-xs bg-background p-2 rounded border-l-2 border-primary"
                              >
                                <Quote className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                                <p className="italic text-muted-foreground line-clamp-2">
                                  "{citation.text}"
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action items */}
                        {fact.action_items && fact.action_items.length > 0 && (
                          <div className="text-xs">
                            <p className="font-medium text-destructive mb-1">Actions requises:</p>
                            <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                              {fact.action_items.slice(0, 2).map((action, i) => (
                                <li key={i} className="line-clamp-1">{action}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
