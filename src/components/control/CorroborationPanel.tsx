import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  GitMerge,
  CheckCircle,
  XCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Corroboration {
  id: string;
  incident_id: string | null;
  corroboration_type: string;
  supporting_evidence: any[];
  contradicting_evidence: any[];
  final_confidence: number | null;
  verification_status: string | null;
  notes: string | null;
  created_at: string;
}

export function CorroborationPanel() {
  const queryClient = useQueryClient();
  
  const { data: corroborations, isLoading } = useQuery({
    queryKey: ['corroborations-panel'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corroborations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as Corroboration[];
    }
  });

  const verifyCorroboration = async (id: string, status: 'verified' | 'rejected') => {
    try {
      await supabase
        .from('corroborations')
        .update({
          verification_status: status,
          verified_at: new Date().toISOString(),
          verified_by: 'user'
        })
        .eq('id', id);
      
      toast.success(status === 'verified' ? 'Corroboration validée' : 'Corroboration rejetée');
      queryClient.invalidateQueries({ queryKey: ['corroborations-panel'] });
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-500/20 text-green-500">Vérifié</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-500">Rejeté</Badge>;
      default:
        return <Badge variant="outline">En attente</Badge>;
    }
  };

  const getConfidenceColor = (confidence: number | null) => {
    if (confidence === null) return 'text-muted-foreground';
    if (confidence >= 0.7) return 'text-green-500';
    if (confidence >= 0.4) return 'text-yellow-500';
    return 'text-red-500';
  };

  const pending = corroborations?.filter(c => !c.verification_status) || [];
  const verified = corroborations?.filter(c => c.verification_status === 'verified') || [];
  const rejected = corroborations?.filter(c => c.verification_status === 'rejected') || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <GitMerge className="h-5 w-5" />
          Corroborations
        </CardTitle>
        <CardDescription>
          Vérification croisée des preuves
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-muted-foreground">Chargement...</span>
          </div>
        ) : !corroborations || corroborations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <GitMerge className="h-12 w-12 mb-2 opacity-50" />
            <p>Aucune corroboration</p>
            <p className="text-sm">Lancez une analyse pour générer des corroborations</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded bg-yellow-500/10 text-center">
                <div className="text-lg font-bold text-yellow-500">{pending.length}</div>
                <div className="text-xs text-yellow-400">En attente</div>
              </div>
              <div className="p-2 rounded bg-green-500/10 text-center">
                <div className="text-lg font-bold text-green-500">{verified.length}</div>
                <div className="text-xs text-green-400">Vérifiées</div>
              </div>
              <div className="p-2 rounded bg-red-500/10 text-center">
                <div className="text-lg font-bold text-red-500">{rejected.length}</div>
                <div className="text-xs text-red-400">Rejetées</div>
              </div>
            </div>

            {/* Pending corroborations */}
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {corroborations.map((corr) => {
                  const supportCount = Array.isArray(corr.supporting_evidence) ? corr.supporting_evidence.length : 0;
                  const contradictCount = Array.isArray(corr.contradicting_evidence) ? corr.contradicting_evidence.length : 0;
                  
                  return (
                    <div 
                      key={corr.id}
                      className="p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusBadge(corr.verification_status)}
                            <Badge variant="outline" className="text-xs">
                              {corr.corroboration_type}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="flex items-center gap-1 text-green-500">
                              <ThumbsUp className="h-3 w-3" />
                              {supportCount} preuves
                            </span>
                            <span className="flex items-center gap-1 text-red-500">
                              <ThumbsDown className="h-3 w-3" />
                              {contradictCount} contre
                            </span>
                            <span className={`font-medium ${getConfidenceColor(corr.final_confidence)}`}>
                              {corr.final_confidence !== null 
                                ? `${Math.round(corr.final_confidence * 100)}%` 
                                : '-'}
                            </span>
                          </div>
                          
                          {corr.notes && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              {corr.notes}
                            </p>
                          )}
                        </div>
                        
                        {!corr.verification_status && (
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-green-500 hover:text-green-600"
                              onClick={() => verifyCorroboration(corr.id, 'verified')}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={() => verifyCorroboration(corr.id, 'rejected')}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        
                        {corr.incident_id && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            asChild
                          >
                            <Link to={`/incidents/${corr.incident_id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
