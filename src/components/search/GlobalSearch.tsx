import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Search, 
  X, 
  Mail, 
  AlertTriangle, 
  FileText,
  Filter,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { EmailLink } from '@/components/email';

interface SearchResult {
  id: string;
  type: 'email' | 'incident' | 'violation';
  title: string;
  subtitle: string;
  date: string;
  severity?: string;
  emailId?: string;
}

interface GlobalSearchProps {
  trigger?: React.ReactNode;
}

export function GlobalSearch({ trigger }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'email' | 'incident'>('all');

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['global-search', query, filter],
    queryFn: async () => {
      if (query.length < 2) return [];
      
      const searchResults: SearchResult[] = [];
      const searchTerm = `%${query}%`;

      // Search emails
      if (filter === 'all' || filter === 'email') {
        const { data: emails } = await supabase
          .from('emails')
          .select('id, subject, sender, received_at')
          .or(`subject.ilike.${searchTerm},sender.ilike.${searchTerm},body.ilike.${searchTerm}`)
          .order('received_at', { ascending: false })
          .limit(10);

        emails?.forEach(email => {
          searchResults.push({
            id: email.id,
            type: 'email',
            title: email.subject,
            subtitle: email.sender,
            date: email.received_at,
            emailId: email.id
          });
        });
      }

      // Search incidents
      if (filter === 'all' || filter === 'incident') {
        const { data: incidents } = await supabase
          .from('incidents')
          .select('id, titre, institution, date_incident, gravite')
          .or(`titre.ilike.${searchTerm},institution.ilike.${searchTerm},faits.ilike.${searchTerm}`)
          .order('date_incident', { ascending: false })
          .limit(10);

        incidents?.forEach(incident => {
          searchResults.push({
            id: incident.id,
            type: 'incident',
            title: incident.titre,
            subtitle: incident.institution,
            date: incident.date_incident,
            severity: incident.gravite
          });
        });
      }

      return searchResults;
    },
    enabled: query.length >= 2
  });

  const handleSelect = useCallback((result: SearchResult) => {
    setOpen(false);
    setQuery('');
    
    if (result.type === 'incident') {
      navigate(`/incidents/${result.id}`);
    }
  }, [navigate]);

  const getSeverityColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'critique': return 'destructive';
      case 'haute': return 'default';
      case 'moyenne': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">Rechercher...</span>
            <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium">
              ⌘K
            </kbd>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="sr-only">Recherche globale</DialogTitle>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher emails, incidents, violations..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 text-base"
              autoFocus
            />
            {query && (
              <Button variant="ghost" size="icon" onClick={() => setQuery('')}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Filters */}
        <div className="flex items-center gap-2 px-4 py-2 border-b">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={filter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Tous
          </Button>
          <Button
            variant={filter === 'email' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('email')}
            className="gap-1"
          >
            <Mail className="h-3 w-3" />
            Emails
          </Button>
          <Button
            variant={filter === 'incident' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('incident')}
            className="gap-1"
          >
            <AlertTriangle className="h-3 w-3" />
            Incidents
          </Button>
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[400px]">
          <div className="p-2">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && query.length >= 2 && results.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Aucun résultat pour "{query}"</p>
              </div>
            )}

            {!isLoading && query.length < 2 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Tapez au moins 2 caractères pour rechercher</p>
              </div>
            )}

            {results.map((result) => (
              <Card 
                key={`${result.type}-${result.id}`}
                className="mb-2 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSelect(result)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5">
                        {result.type === 'email' ? (
                          <Mail className="h-5 w-5 text-primary" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{result.title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {result.subtitle}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(result.date), 'd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.severity && (
                        <Badge variant={getSeverityColor(result.severity) as any}>
                          {result.severity}
                        </Badge>
                      )}
                      {result.type === 'email' && result.emailId && (
                        <EmailLink
                          emailId={result.emailId}
                          label=""
                          variant="ghost"
                          size="icon"
                          showIcon
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
