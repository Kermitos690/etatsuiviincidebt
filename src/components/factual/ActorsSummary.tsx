import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { User, Mail, Building, AlertTriangle, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

interface Actor {
  name: string;
  email?: string;
  institution?: string;
  emailCount: number;
  dysfunctionCount: number;
  lastContact: string;
}

interface ActorsSummaryProps {
  actors: Actor[];
}

export function ActorsSummary({ actors }: ActorsSummaryProps) {
  const maxEmails = Math.max(...actors.map(a => a.emailCount), 1);
  const maxDysfunctions = Math.max(...actors.map(a => a.dysfunctionCount), 1);

  if (actors.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">Aucun acteur identifié</h3>
          <p className="text-sm text-muted-foreground">
            Extrayez les faits pour identifier les acteurs
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort by dysfunction count (descending) then by email count
  const sortedActors = [...actors].sort((a, b) => {
    if (b.dysfunctionCount !== a.dysfunctionCount) {
      return b.dysfunctionCount - a.dysfunctionCount;
    }
    return b.emailCount - a.emailCount;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          Acteurs impliqués
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {sortedActors.map((actor, index) => (
              <div 
                key={index}
                className={`border rounded-lg p-4 space-y-3 ${
                  actor.dysfunctionCount > 0 ? 'border-destructive/30 bg-destructive/5' : ''
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {actor.name}
                    </p>
                    {actor.email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {actor.email}
                      </p>
                    )}
                    {actor.institution && (
                      <Badge variant="outline" className="text-xs">
                        <Building className="h-3 w-3 mr-1" />
                        {actor.institution}
                      </Badge>
                    )}
                  </div>

                  {actor.dysfunctionCount > 0 && (
                    <Badge variant="destructive" className="shrink-0">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {actor.dysfunctionCount} problème{actor.dysfunctionCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-muted-foreground">Emails</span>
                      <span className="font-medium">{actor.emailCount}</span>
                    </div>
                    <Progress 
                      value={(actor.emailCount / maxEmails) * 100} 
                      className="h-1.5"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-muted-foreground">Dysfonct.</span>
                      <span className="font-medium text-destructive">{actor.dysfunctionCount}</span>
                    </div>
                    <Progress 
                      value={(actor.dysfunctionCount / maxDysfunctions) * 100} 
                      className="h-1.5 [&>div]:bg-destructive"
                    />
                  </div>
                </div>

                {/* Last contact */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Dernier contact: {format(new Date(actor.lastContact), 'dd/MM/yyyy', { locale: fr })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
