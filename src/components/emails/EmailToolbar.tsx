import React, { memo, useState } from 'react';
import {
  Search, Filter, SortAsc, SortDesc, Layers, List, RefreshCw, Brain,
  Settings, ChevronDown, AlertTriangle, Clock, X, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface EmailToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortOrder: 'desc' | 'asc';
  onSortOrderChange: (order: 'desc' | 'asc') => void;
  viewMode: 'threads' | 'list';
  onViewModeChange: (mode: 'threads' | 'list') => void;
  filterIncidents: boolean;
  onFilterIncidentsChange: (value: boolean) => void;
  filterUnprocessed: boolean;
  onFilterUnprocessedChange: (value: boolean) => void;
  showAllEmails: boolean;
  onShowAllEmailsChange: (value: boolean) => void;
  onRefresh: () => void;
  onAnalyzeAll: () => void;
  onOpenSettings: () => void;
  isLoading: boolean;
  isProcessing: boolean;
  stats: {
    totalThreads: number;
    incidents: number;
    unprocessed: number;
  };
}

function EmailToolbarInner({
  searchQuery,
  onSearchChange,
  sortOrder,
  onSortOrderChange,
  viewMode,
  onViewModeChange,
  filterIncidents,
  onFilterIncidentsChange,
  filterUnprocessed,
  onFilterUnprocessedChange,
  showAllEmails,
  onShowAllEmailsChange,
  onRefresh,
  onAnalyzeAll,
  onOpenSettings,
  isLoading,
  isProcessing,
  stats,
}: EmailToolbarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const activeFiltersCount = [filterIncidents, filterUnprocessed].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Main toolbar row */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Search - Expands on mobile when focused */}
        <div 
          className={cn(
            "relative transition-all duration-300",
            isSearchFocused ? "flex-1 min-w-full sm:min-w-[300px]" : "flex-1 min-w-[140px] sm:min-w-[200px]"
          )}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className={cn(
              "pl-9 pr-8 h-10 bg-secondary/50 border-border/50",
              "focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
              "transition-all duration-200"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Mobile: Compact action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "h-10 px-3 gap-1.5",
                  activeFiltersCount > 0 && "border-primary/50 bg-primary/5"
                )}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filtres</span>
                {activeFiltersCount > 0 && (
                  <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem 
                onClick={() => onFilterIncidentsChange(!filterIncidents)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span>Incidents ({stats.incidents})</span>
                </div>
                {filterIncidents && <Badge variant="secondary" className="h-5">Actif</Badge>}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onFilterUnprocessedChange(!filterUnprocessed)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span>Non traités ({stats.unprocessed})</span>
                </div>
                {filterUnprocessed && <Badge variant="secondary" className="h-5">Actif</Badge>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onShowAllEmailsChange(!showAllEmails)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {showAllEmails ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  <span>{showAllEmails ? 'Tous les emails' : 'Filtrés uniquement'}</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSortOrderChange(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="h-10 px-3 gap-1.5"
          >
            {sortOrder === 'desc' ? (
              <SortDesc className="h-4 w-4" />
            ) : (
              <SortAsc className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Récents' : 'Anciens'}</span>
          </Button>

          {/* View mode toggle */}
          <div className="hidden sm:flex items-center gap-0.5 p-1 rounded-lg bg-secondary/50 border border-border/50">
            <Button
              variant={viewMode === 'threads' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('threads')}
              className={cn("h-8 w-8 p-0", viewMode === 'threads' && "shadow-sm")}
            >
              <Layers className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('list')}
              className={cn("h-8 w-8 p-0", viewMode === 'list' && "shadow-sm")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Settings */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            className="h-10 w-10 p-0"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Action buttons row - Responsive */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-9"
        >
          <RefreshCw className={cn("h-4 w-4 mr-1.5", isLoading && "animate-spin")} />
          <span className="hidden xs:inline">Actualiser</span>
        </Button>

        <Button
          onClick={onAnalyzeAll}
          disabled={isProcessing}
          size="sm"
          className="h-9 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-glow-sm"
        >
          <Brain className={cn("h-4 w-4 mr-1.5", isProcessing && "animate-spin")} />
          Analyser nouveaux
        </Button>

        {/* Active filters chips */}
        {(filterIncidents || filterUnprocessed) && (
          <div className="flex items-center gap-1.5 ml-auto">
            {filterIncidents && (
              <Badge 
                variant="secondary" 
                className="cursor-pointer hover:bg-destructive/20 transition-colors"
                onClick={() => onFilterIncidentsChange(false)}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Incidents
                <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
            {filterUnprocessed && (
              <Badge 
                variant="secondary" 
                className="cursor-pointer hover:bg-amber-500/20 transition-colors"
                onClick={() => onFilterUnprocessedChange(false)}
              >
                <Clock className="h-3 w-3 mr-1" />
                Non traités
                <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const EmailToolbar = memo(EmailToolbarInner);
export default EmailToolbar;
