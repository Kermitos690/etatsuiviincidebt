import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import {
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Minus
} from 'lucide-react';

interface ActorTrustScore {
  id: string;
  actor_name: string;
  actor_email: string | null;
  actor_role: string | null;
  actor_institution: string | null;
  trust_score: number | null;
  helpful_actions_count: number | null;
  promises_broken_count: number | null;
  contradictions_count: number | null;
  hidden_communications_count: number | null;
}

export function ActorTrustPanel() {
  const { data: actors, isLoading } = useQuery({
    queryKey: ['actor-trust-scores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('actor_trust_scores')
        .select('*')
        .order('trust_score', { ascending: true })
        .limit(20);
      
      if (error) throw error;
      return data as ActorTrustScore[];
    }
  });

  const getTrustColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getTrustBgColor = (score: number | null) => {
    if (score === null) return 'bg-muted/50';
    if (score >= 70) return 'bg-green-500/10 border-green-500/30';
    if (score >= 40) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const getTrustIcon = (score: number | null) => {
    if (score === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (score >= 70) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (score >= 40) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const suspiciousActors = actors?.filter(a => (a.trust_score || 50) < 40) || [];
  const neutralActors = actors?.filter(a => (a.trust_score || 50) >= 40 && (a.trust_score || 50) < 70) || [];
  const trustedActors = actors?.filter(a => (a.trust_score || 50) >= 70) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Scores de Confiance
        </CardTitle>
        <CardDescription>
          Analyse comportementale des acteurs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-muted-foreground">Chargement...</span>
          </div>
        ) : !actors || actors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mb-2 opacity-50" />
            <p>Aucun acteur analysé</p>
            <p className="text-sm">Les scores sont générés automatiquement lors des analyses</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded bg-red-500/10 text-center">
                <div className="text-lg font-bold text-red-500">{suspiciousActors.length}</div>
                <div className="text-xs text-red-400">Suspects</div>
              </div>
              <div className="p-2 rounded bg-yellow-500/10 text-center">
                <div className="text-lg font-bold text-yellow-500">{neutralActors.length}</div>
                <div className="text-xs text-yellow-400">Neutres</div>
              </div>
              <div className="p-2 rounded bg-green-500/10 text-center">
                <div className="text-lg font-bold text-green-500">{trustedActors.length}</div>
                <div className="text-xs text-green-400">Fiables</div>
              </div>
            </div>

            {/* Actor List */}
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {actors.map((actor) => (
                  <div 
                    key={actor.id}
                    className={`p-3 rounded-lg border ${getTrustBgColor(actor.trust_score)}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={getTrustColor(actor.trust_score)}>
                          {getInitials(actor.actor_name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {actor.actor_name}
                          </span>
                          {getTrustIcon(actor.trust_score)}
                        </div>
                        {actor.actor_institution && (
                          <p className="text-xs text-muted-foreground truncate">
                            {actor.actor_institution}
                          </p>
                        )}
                        {actor.actor_role && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {actor.actor_role}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-xl font-bold ${getTrustColor(actor.trust_score)}`}>
                          {actor.trust_score ?? '-'}
                        </div>
                        <Progress 
                          value={actor.trust_score || 0} 
                          className="h-1 w-16 mt-1"
                        />
                      </div>
                    </div>
                    
                    {/* Behavior indicators */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {(actor.helpful_actions_count || 0) > 0 && (
                        <span className="flex items-center gap-1 text-green-500">
                          <TrendingUp className="h-3 w-3" />
                          {actor.helpful_actions_count} aide
                        </span>
                      )}
                      {(actor.promises_broken_count || 0) > 0 && (
                        <span className="flex items-center gap-1 text-red-500">
                          <XCircle className="h-3 w-3" />
                          {actor.promises_broken_count} rompu
                        </span>
                      )}
                      {(actor.contradictions_count || 0) > 0 && (
                        <span className="flex items-center gap-1 text-orange-500">
                          <AlertTriangle className="h-3 w-3" />
                          {actor.contradictions_count} contradiction
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
