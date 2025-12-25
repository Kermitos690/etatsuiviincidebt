import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Plus, Eye, Pencil, Send, FileText, MoreHorizontal, CalendarIcon, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AppLayout, PageHeader } from '@/components/layout';
import { PriorityBadge, StatusBadge } from '@/components/common';
import { useIncidentStore } from '@/stores/incidentStore';
import { formatDate } from '@/config/appConfig';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Incident } from '@/types/incident';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const ITEMS_PER_PAGE = 10;

type SortField = 'numero' | 'dateIncident' | 'titre' | 'institution' | 'type' | 'statut' | 'score';
type SortDirection = 'asc' | 'desc';

export default function Incidents() {
  const { incidents, config, updateIncident, filters, setFilters, clearFilters, getFilteredIncidents } = useIncidentStore();
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateDebut, setDateDebut] = useState<Date | undefined>(undefined);
  const [dateFin, setDateFin] = useState<Date | undefined>(undefined);
  const [sortField, setSortField] = useState<SortField>('numero');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Apply date filters
  const handleDateDebutChange = (date: Date | undefined) => {
    setDateDebut(date);
    setFilters({ dateDebut: date ? format(date, 'yyyy-MM-dd') : undefined });
    setCurrentPage(1);
  };

  const handleDateFinChange = (date: Date | undefined) => {
    setDateFin(date);
    setFilters({ dateFin: date ? format(date, 'yyyy-MM-dd') : undefined });
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    clearFilters();
    setDateDebut(undefined);
    setDateFin(undefined);
    setCurrentPage(1);
  };

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const filteredIncidents = useMemo(() => {
    let result = getFilteredIncidents();
    
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(i => 
        i.titre.toLowerCase().includes(s) ||
        i.faits.toLowerCase().includes(s) ||
        String(i.numero).includes(s)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'numero':
          comparison = a.numero - b.numero;
          break;
        case 'dateIncident':
          comparison = a.dateIncident.localeCompare(b.dateIncident);
          break;
        case 'titre':
          comparison = a.titre.localeCompare(b.titre);
          break;
        case 'institution':
          comparison = a.institution.localeCompare(b.institution);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'statut':
          comparison = a.statut.localeCompare(b.statut);
          break;
        case 'score':
          comparison = a.score - b.score;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [getFilteredIncidents, search, sortField, sortDirection]);

  // Export CSV
  const exportToCSV = () => {
    const headers = ['N°', 'Date', 'Titre', 'Institution', 'Type', 'Gravité', 'Statut', 'Priorité', 'Score', 'Transmis JP'];
    const rows = filteredIncidents.map(inc => [
      inc.numero,
      inc.dateIncident,
      `"${inc.titre.replace(/"/g, '""')}"`,
      inc.institution,
      inc.type,
      inc.gravite,
      inc.statut,
      inc.priorite,
      inc.score,
      inc.transmisJP ? 'Oui' : 'Non'
    ]);
    
    const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `incidents_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredIncidents.length} incidents exportés en CSV`);
  };

  // Pagination
  const totalPages = Math.ceil(filteredIncidents.length / ITEMS_PER_PAGE);
  const paginatedIncidents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredIncidents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredIncidents, currentPage]);

  const markTransmisJP = (id: string) => {
    updateIncident(id, { 
      transmisJP: true, 
      dateTransmissionJP: new Date().toISOString(),
      statut: 'Transmis'
    });
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6">
        <PageHeader 
          title="Liste des incidents" 
          description={`${incidents.length} incidents enregistrés`}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filteredIncidents.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
              <Button asChild size="sm">
                <Link to="/nouveau">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Nouvel incident</span>
                  <span className="sm:hidden">Nouveau</span>
                </Link>
              </Button>
            </div>
          }
        />

        {/* Filters */}
        <Card className="mb-4 md:mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-col gap-3">
              {/* Search + Filter toggle */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                  className="md:hidden"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              {/* Filter selects - Always visible on desktop, toggleable on mobile */}
              <div className={`flex-wrap gap-2 ${showFilters ? 'flex' : 'hidden'} md:flex`}>
                {/* Date début */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full sm:w-[140px] justify-start text-left font-normal",
                        !dateDebut && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateDebut ? format(dateDebut, "dd/MM/yyyy") : "Date début"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateDebut}
                      onSelect={handleDateDebutChange}
                      initialFocus
                      locale={fr}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                {/* Date fin */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full sm:w-[140px] justify-start text-left font-normal",
                        !dateFin && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFin ? format(dateFin, "dd/MM/yyyy") : "Date fin"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFin}
                      onSelect={handleDateFinChange}
                      initialFocus
                      locale={fr}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                <Select 
                  value={filters.institution || 'all'} 
                  onValueChange={(v) => { setFilters({ institution: v === 'all' ? undefined : v }); setCurrentPage(1); }}
                >
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Institution" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">Toutes</SelectItem>
                    {config.institutions.map(inst => (
                      <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select 
                  value={filters.statut || 'all'} 
                  onValueChange={(v) => { setFilters({ statut: v === 'all' ? undefined : v }); setCurrentPage(1); }}
                >
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">Tous</SelectItem>
                    {config.statuts.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select 
                  value={filters.gravite || 'all'} 
                  onValueChange={(v) => { setFilters({ gravite: v === 'all' ? undefined : v }); setCurrentPage(1); }}
                >
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Gravité" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">Toutes</SelectItem>
                    {config.gravites.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={handleClearFilters} size="sm">
                  Effacer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile Cards View */}
        <div className="md:hidden space-y-3">
          {paginatedIncidents.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucun incident trouvé
              </CardContent>
            </Card>
          ) : (
            paginatedIncidents.map((incident) => (
              <Card key={incident.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">#{incident.numero}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(incident.dateIncident)}</span>
                      </div>
                      <h3 className="font-medium mt-1 line-clamp-2">{incident.titre}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{incident.institution}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover z-50">
                        <DropdownMenuItem asChild>
                          <Link to={`/incidents/${incident.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Voir détail
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/incidents/${incident.id}/edit`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier
                          </Link>
                        </DropdownMenuItem>
                        {!incident.transmisJP && (
                          <DropdownMenuItem onClick={() => markTransmisJP(incident.id)}>
                            <Send className="h-4 w-4 mr-2" />
                            Transmettre JP
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <StatusBadge status={incident.statut} />
                    <PriorityBadge 
                      priority={incident.priorite} 
                      score={incident.score}
                      showTooltip={false}
                    />
                    {incident.transmisJP && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                        JP
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="w-16 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('numero')}
                    >
                      <div className="flex items-center">
                        N°
                        <SortIcon field="numero" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-24 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('dateIncident')}
                    >
                      <div className="flex items-center">
                        Date
                        <SortIcon field="dateIncident" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('titre')}
                    >
                      <div className="flex items-center">
                        Titre
                        <SortIcon field="titre" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('institution')}
                    >
                      <div className="flex items-center">
                        Institution
                        <SortIcon field="institution" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center">
                        Type
                        <SortIcon field="type" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('statut')}
                    >
                      <div className="flex items-center">
                        Statut
                        <SortIcon field="statut" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('score')}
                    >
                      <div className="flex items-center">
                        Priorité
                        <SortIcon field="score" />
                      </div>
                    </TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedIncidents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Aucun incident trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedIncidents.map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell className="font-mono font-medium">
                          {incident.numero}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatDate(incident.dateIncident)}
                        </TableCell>
                        <TableCell className="max-w-[250px] truncate font-medium">
                          {incident.titre}
                        </TableCell>
                        <TableCell>{incident.institution}</TableCell>
                        <TableCell>{incident.type}</TableCell>
                        <TableCell>
                          <StatusBadge status={incident.statut} />
                        </TableCell>
                        <TableCell>
                          <PriorityBadge 
                            priority={incident.priorite} 
                            score={incident.score}
                            gravite={incident.gravite}
                            type={incident.type}
                          />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover z-50">
                              <DropdownMenuItem asChild>
                                <Link to={`/incidents/${incident.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Voir détail
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/incidents/${incident.id}/edit`}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Modifier
                                </Link>
                              </DropdownMenuItem>
                              {!incident.transmisJP && (
                                <DropdownMenuItem onClick={() => markTransmisJP(incident.id)}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Transmettre JP
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>
                                <FileText className="h-4 w-4 mr-2" />
                                Export PDF
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Affichage de {((currentPage - 1) * ITEMS_PER_PAGE) + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, filteredIncidents.length)} sur {filteredIncidents.length} incidents
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={currentPage === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
