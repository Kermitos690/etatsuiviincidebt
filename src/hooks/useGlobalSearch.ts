import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { debounce } from '@/lib/utils';

export type SearchResultType = 'email' | 'incident' | 'situation' | 'document' | 'actor';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  excerpt?: string;
  date?: string;
  priority?: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface SearchFilters {
  types: SearchResultType[];
}

export function useGlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    types: ['email', 'incident', 'situation', 'document', 'actor'],
  });

  const performSearch = useCallback(async (searchQuery: string, searchFilters: SearchFilters) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const allResults: SearchResult[] = [];
    const searchTerm = `%${searchQuery.toLowerCase()}%`;

    try {
      // Search in parallel
      const searches = [];

      if (searchFilters.types.includes('email')) {
        searches.push(
          supabase
            .from('emails')
            .select('id, subject, sender, body, received_at')
            .or(`subject.ilike.${searchTerm},sender.ilike.${searchTerm}`)
            .order('received_at', { ascending: false })
            .limit(8)
        );
      }

      if (searchFilters.types.includes('incident')) {
        searches.push(
          supabase
            .from('incidents')
            .select('id, titre, institution, faits, priorite, date_incident')
            .or(`titre.ilike.${searchTerm},institution.ilike.${searchTerm}`)
            .order('date_incident', { ascending: false })
            .limit(8)
        );
      }

      if (searchFilters.types.includes('situation')) {
        searches.push(
          supabase
            .from('pdf_folders')
            .select('id, name, description, institution_concerned, priority, problem_score')
            .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
            .limit(8)
        );
      }

      const responses = await Promise.all(searches);

      // Process emails
      if (searchFilters.types.includes('email') && responses[0]?.data) {
        responses[0].data.forEach((email: any) => {
          allResults.push({
            id: email.id, type: 'email', title: email.subject,
            subtitle: email.sender, date: email.received_at,
          });
        });
      }

      // Process incidents
      const incidentIdx = searchFilters.types.includes('email') ? 1 : 0;
      if (searchFilters.types.includes('incident') && responses[incidentIdx]?.data) {
        responses[incidentIdx].data.forEach((inc: any) => {
          allResults.push({
            id: inc.id, type: 'incident', title: inc.titre,
            subtitle: inc.institution, priority: inc.priorite, date: inc.date_incident,
          });
        });
      }

      setResults(allResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const debouncedSearch = useMemo(
    () => debounce((q: string, f: SearchFilters) => performSearch(q, f), 300),
    [performSearch]
  );

  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
    debouncedSearch(newQuery, filters);
  }, [debouncedSearch, filters]);

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    if (query) performSearch(query, updated);
  }, [filters, query, performSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return { query, results, isSearching, filters, search, updateFilters, clearSearch };
}
