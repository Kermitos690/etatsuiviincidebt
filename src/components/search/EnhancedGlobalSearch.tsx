import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, X, Mail, AlertTriangle, Folder, FileText, 
  User, Filter, Calendar, Building
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useGlobalSearch, type SearchResult, type SearchResultType } from '@/hooks/useGlobalSearch';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_CONFIG: Record<SearchResultType, { icon: typeof Mail; label: string; color: string }> = {
  email: { icon: Mail, label: 'Email', color: 'text-blue-500 bg-blue-500/10' },
  incident: { icon: AlertTriangle, label: 'Incident', color: 'text-red-500 bg-red-500/10' },
  situation: { icon: Folder, label: 'Situation', color: 'text-purple-500 bg-purple-500/10' },
  document: { icon: FileText, label: 'Document', color: 'text-green-500 bg-green-500/10' },
  actor: { icon: User, label: 'Acteur', color: 'text-amber-500 bg-amber-500/10' },
};

function SearchResultItem({ result, onClick }: { result: SearchResult; onClick: () => void }) {
  const config = TYPE_CONFIG[result.type];
  const Icon = config.icon;

  return (
    <button
      type="button"
      className="w-full p-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg shrink-0", config.color)}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{result.title}</p>
            <Badge variant="outline" className="text-xs shrink-0">
              {config.label}
            </Badge>
          </div>

          {result.subtitle && (
            <p className="text-xs text-muted-foreground truncate">
              {result.subtitle}
            </p>
          )}

          {result.excerpt && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {result.excerpt}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {result.date && (
              <span>
                {formatDistanceToNow(new Date(result.date), { 
                  addSuffix: true, 
                  locale: fr 
                })}
              </span>
            )}
            {result.priority && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs py-0",
                  result.priority === 'critique' && 'text-red-500 border-red-500/30',
                  result.priority === 'haute' && 'text-orange-500 border-orange-500/30'
                )}
              >
                {result.priority}
              </Badge>
            )}
            {result.score !== undefined && result.score > 0 && (
              <Badge variant="outline" className="text-xs py-0">
                Score: {result.score}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export function EnhancedGlobalSearch({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, results, isSearching, filters, search, updateFilters, clearSearch } = useGlobalSearch();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleClose = () => {
    clearSearch();
    onClose();
  };

  const handleResultClick = (result: SearchResult) => {
    handleClose();
    
    switch (result.type) {
      case 'email':
        navigate('/emails-analyzed');
        break;
      case 'incident':
        navigate(`/incidents/${result.id}`);
        break;
      case 'situation':
        navigate('/pdf-documents');
        break;
      case 'document':
        navigate('/pdf-documents');
        break;
      case 'actor':
        navigate('/control-center');
        break;
    }
  };

  const toggleType = (type: SearchResultType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    
    if (newTypes.length > 0) {
      updateFilters({ types: newTypes });
    }
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<SearchResultType, SearchResult[]>);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="sr-only">Recherche globale</DialogTitle>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Rechercher dans emails, incidents, situations, documents..."
                value={query}
                onChange={(e) => search(e.target.value)}
                className="pl-10 pr-10"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={clearSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="end">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Filtrer par type</h4>
                  {(Object.keys(TYPE_CONFIG) as SearchResultType[]).map(type => {
                    const config = TYPE_CONFIG[type];
                    const Icon = config.icon;
                    return (
                      <label 
                        key={type}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={filters.types.includes(type)}
                          onCheckedChange={() => toggleType(type)}
                        />
                        <Icon className="h-4 w-4" />
                        <span className="text-sm">{config.label}</span>
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </DialogHeader>

        <div className="p-4 pt-2">
          {/* Type filter chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {(Object.keys(TYPE_CONFIG) as SearchResultType[]).map(type => {
              const config = TYPE_CONFIG[type];
              const isActive = filters.types.includes(type);
              return (
                <Badge
                  key={type}
                  variant={isActive ? "default" : "outline"}
                  className={cn("cursor-pointer", !isActive && "opacity-50")}
                  onClick={() => toggleType(type)}
                >
                  {config.label}
                </Badge>
              );
            })}
          </div>

          {/* Results */}
          <ScrollArea className="h-[400px]">
            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : !query ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Tapez pour rechercher</p>
                <p className="text-xs mt-1">
                  Raccourci: <kbd className="px-1 py-0.5 bg-muted rounded text-xs">⌘K</kbd>
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucun résultat pour "{query}"</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(Object.keys(groupedResults) as SearchResultType[]).map(type => {
                  const typeResults = groupedResults[type];
                  const config = TYPE_CONFIG[type];
                  
                  return (
                    <div key={type}>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                        <config.icon className="h-3 w-3" />
                        {config.label}s ({typeResults.length})
                      </h4>
                      <div className="space-y-1">
                        {typeResults.map(result => (
                          <SearchResultItem
                            key={`${result.type}-${result.id}`}
                            result={result}
                            onClick={() => handleResultClick(result)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Keyboard shortcut hook
export function useSearchShortcut(onOpen: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpen]);
}
