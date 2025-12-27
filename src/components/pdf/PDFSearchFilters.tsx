import React, { useState, useMemo } from 'react';
import { Search, Filter, Calendar, Tag, FileType, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PDFDocument } from './types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface PDFFilters {
  search: string;
  tags: string[];
  documentType: string | null;
  severity: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  hasIncident: boolean | null;
  hasAnalysis: boolean | null;
}

interface PDFSearchFiltersProps {
  filters: PDFFilters;
  onFiltersChange: (filters: PDFFilters) => void;
  allTags: string[];
  documentTypes: string[];
}

const severityOptions = [
  { value: 'critical', label: 'Critique', color: 'bg-red-500' },
  { value: 'high', label: 'Élevé', color: 'bg-orange-500' },
  { value: 'medium', label: 'Moyen', color: 'bg-yellow-500' },
  { value: 'low', label: 'Faible', color: 'bg-blue-500' },
  { value: 'none', label: 'Aucun', color: 'bg-green-500' },
];

export function PDFSearchFilters({
  filters,
  onFiltersChange,
  allTags,
  documentTypes,
}: PDFSearchFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.tags.length > 0) count++;
    if (filters.documentType) count++;
    if (filters.severity) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.hasIncident !== null) count++;
    if (filters.hasAnalysis !== null) count++;
    return count;
  }, [filters]);

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    onFiltersChange({ ...filters, tags: newTags });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      tags: [],
      documentType: null,
      severity: null,
      dateFrom: null,
      dateTo: null,
      hasIncident: null,
      hasAnalysis: null,
    });
  };

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, contenu, résumé..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Button
          variant={showAdvanced ? "secondary" : "outline"}
          size="icon"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="relative"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Effacer
          </Button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="p-4 rounded-lg border bg-muted/30 space-y-4 animate-fade-in">
          {/* Document type & Severity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Type de document</label>
              <Select
                value={filters.documentType || "all"}
                onValueChange={(v) => onFiltersChange({ ...filters, documentType: v === "all" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {documentTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Sévérité</label>
              <Select
                value={filters.severity || "all"}
                onValueChange={(v) => onFiltersChange({ ...filters, severity: v === "all" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {severityOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", opt.color)} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date range */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Période</label>
            <div className="flex gap-2 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    {filters.dateFrom 
                      ? format(filters.dateFrom, 'dd MMM yyyy', { locale: fr })
                      : 'Date début'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.dateFrom || undefined}
                    onSelect={(date) => onFiltersChange({ ...filters, dateFrom: date || null })}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">→</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    {filters.dateTo 
                      ? format(filters.dateTo, 'dd MMM yyyy', { locale: fr })
                      : 'Date fin'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.dateTo || undefined}
                    onSelect={(date) => onFiltersChange({ ...filters, dateTo: date || null })}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Analysis & Incident filters */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filters.hasAnalysis === true ? "secondary" : "outline"}
              size="sm"
              onClick={() => onFiltersChange({ 
                ...filters, 
                hasAnalysis: filters.hasAnalysis === true ? null : true 
              })}
            >
              Avec analyse
            </Button>
            <Button
              variant={filters.hasAnalysis === false ? "secondary" : "outline"}
              size="sm"
              onClick={() => onFiltersChange({ 
                ...filters, 
                hasAnalysis: filters.hasAnalysis === false ? null : false 
              })}
            >
              Sans analyse
            </Button>
            <Button
              variant={filters.hasIncident === true ? "secondary" : "outline"}
              size="sm"
              onClick={() => onFiltersChange({ 
                ...filters, 
                hasIncident: filters.hasIncident === true ? null : true 
              })}
            >
              Incident détecté
            </Button>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-1.5 block flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={filters.tags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/80 transition-colors"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active filters badges */}
      {(filters.tags.length > 0 || filters.documentType || filters.severity || filters.dateFrom) && (
        <div className="flex flex-wrap gap-1.5">
          {filters.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="gap-1">
              <Tag className="h-3 w-3" />
              {tag}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => handleTagToggle(tag)}
              />
            </Badge>
          ))}
          {filters.documentType && (
            <Badge variant="secondary" className="gap-1">
              <FileType className="h-3 w-3" />
              {filters.documentType}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => onFiltersChange({ ...filters, documentType: null })}
              />
            </Badge>
          )}
          {filters.severity && (
            <Badge variant="secondary" className="gap-1">
              Sévérité: {severityOptions.find(o => o.value === filters.severity)?.label}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => onFiltersChange({ ...filters, severity: null })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// Filter function to apply filters to documents
export function filterDocuments(documents: PDFDocument[], filters: PDFFilters): PDFDocument[] {
  return documents.filter(doc => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matches = 
        doc.original_filename.toLowerCase().includes(searchLower) ||
        doc.extracted_text?.toLowerCase().includes(searchLower) ||
        doc.analysis?.summary?.toLowerCase().includes(searchLower) ||
        doc.tags?.some(t => t.toLowerCase().includes(searchLower));
      if (!matches) return false;
    }

    // Tags filter
    if (filters.tags.length > 0) {
      if (!doc.tags || !filters.tags.every(t => doc.tags.includes(t))) return false;
    }

    // Document type filter
    if (filters.documentType && doc.document_type !== filters.documentType) return false;

    // Severity filter
    if (filters.severity && doc.analysis?.severity !== filters.severity) return false;

    // Date filters
    if (filters.dateFrom) {
      const docDate = new Date(doc.created_at);
      if (docDate < filters.dateFrom) return false;
    }
    if (filters.dateTo) {
      const docDate = new Date(doc.created_at);
      const endOfDay = new Date(filters.dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      if (docDate > endOfDay) return false;
    }

    // Analysis filter
    if (filters.hasAnalysis === true && !doc.analysis) return false;
    if (filters.hasAnalysis === false && doc.analysis) return false;

    // Incident filter
    if (filters.hasIncident === true && !doc.analysis?.ai_analysis?.isIncident) return false;

    return true;
  });
}

export default PDFSearchFilters;
