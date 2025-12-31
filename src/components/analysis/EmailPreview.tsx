import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Eye, 
  Mail, 
  Filter, 
  RefreshCw, 
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface EmailPreviewProps {
  domains: string[];
  keywords: string[];
  useFilters: boolean;
  onPreviewReady?: (count: number) => void;
}

interface PreviewEmail {
  id: string;
  subject: string;
  sender: string;
  received_at: string;
  processed: boolean;
}

export function EmailPreview({ domains, keywords, useFilters, onPreviewReady }: EmailPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasFilters = useFilters && (domains.length > 0 || keywords.length > 0);

  // Query to count and preview filtered emails
  const { data: previewData, isLoading, refetch } = useQuery({
    queryKey: ['email-preview', domains, keywords, useFilters],
    queryFn: async () => {
      let query = supabase
        .from('emails')
        .select('id, subject, sender, received_at, processed');

      // Apply domain filters if enabled
      if (hasFilters && domains.length > 0) {
        const domainConditions = domains.map(d => `sender.ilike.%${d}%`).join(',');
        query = query.or(domainConditions);
      }

      // For keywords, we need to filter in the subject or body
      // Note: This is a simplified approach - exact keyword matching in SQL
      if (hasFilters && keywords.length > 0) {
        const keywordConditions = keywords.map(k => `subject.ilike.%${k}%`).join(',');
        query = query.or(keywordConditions);
      }

      // Fetch up to 500 for preview (single batch OK for preview)
      const { data, error, count } = await query
        .order('received_at', { ascending: false })
        .range(0, 499);

      if (error) throw error;

      // Get total count
      let countQuery = supabase
        .from('emails')
        .select('id', { count: 'exact', head: true });

      if (hasFilters && domains.length > 0) {
        const domainConditions = domains.map(d => `sender.ilike.%${d}%`).join(',');
        countQuery = countQuery.or(domainConditions);
      }

      if (hasFilters && keywords.length > 0) {
        const keywordConditions = keywords.map(k => `subject.ilike.%${k}%`).join(',');
        countQuery = countQuery.or(keywordConditions);
      }

      const { count: totalCount } = await countQuery;

      // Also get unfiltered total for comparison
      const { count: totalAllEmails } = await supabase
        .from('emails')
        .select('id', { count: 'exact', head: true });

      return {
        emails: data as PreviewEmail[],
        filteredCount: totalCount || 0,
        totalCount: totalAllEmails || 0,
        processedCount: data?.filter(e => e.processed).length || 0
      };
    },
    refetchOnWindowFocus: false
  });

  // Notify parent of preview count
  useEffect(() => {
    if (previewData && onPreviewReady) {
      onPreviewReady(previewData.filteredCount);
    }
  }, [previewData, onPreviewReady]);

  const filterPercentage = previewData 
    ? Math.round((previewData.filteredCount / previewData.totalCount) * 100) 
    : 0;

  return (
    <Card className="glass-card border-primary/20">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Prévisualisation des emails
                  {hasFilters && (
                    <Badge variant="outline" className="text-xs bg-primary/10">
                      <Filter className="h-3 w-3 mr-1" />
                      Filtres actifs
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-sm">
                  {isLoading ? (
                    'Calcul en cours...'
                  ) : (
                    <>
                      <span className="text-primary font-semibold">{previewData?.filteredCount || 0}</span>
                      {' emails seront analysés'}
                      {hasFilters && (
                        <span className="text-muted-foreground">
                          {' '}(sur {previewData?.totalCount || 0} total - {filterPercentage}%)
                        </span>
                      )}
                    </>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          {/* Summary badges */}
          {!isLoading && previewData && (
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="secondary" className="text-xs">
                <Mail className="h-3 w-3 mr-1" />
                {previewData.filteredCount} à analyser
              </Badge>
              <Badge 
                variant="outline" 
                className={`text-xs ${previewData.processedCount > 0 ? 'bg-green-500/10 text-green-600 border-green-500/30' : ''}`}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {previewData.processedCount} déjà traités
              </Badge>
              {!hasFilters && (
                <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Tous les emails (pas de filtre)
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : previewData?.emails.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun email ne correspond aux filtres</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] rounded-md border border-border/50">
                <div className="p-3 space-y-2">
                  {previewData?.emails.slice(0, 50).map((email) => (
                    <div 
                      key={email.id} 
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{email.subject || '(Sans sujet)'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {email.sender} • {format(new Date(email.received_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {email.processed ? (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Traité
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            En attente
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {previewData && previewData.filteredCount > 50 && (
                    <div className="text-center py-2 text-xs text-muted-foreground">
                      ... et {previewData.filteredCount - 50} autres emails
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            {/* Filter details */}
            {hasFilters && (
              <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs font-medium text-primary mb-2">Filtres appliqués :</p>
                <div className="flex flex-wrap gap-2">
                  {domains.map((domain, i) => (
                    <Badge key={`d-${i}`} variant="outline" className="text-xs">
                      Domaine: {domain}
                    </Badge>
                  ))}
                  {keywords.map((keyword, i) => (
                    <Badge key={`k-${i}`} variant="secondary" className="text-xs">
                      Mot-clé: {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
