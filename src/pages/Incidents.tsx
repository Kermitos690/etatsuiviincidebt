import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Plus, Eye, Pencil, Send, FileText, MoreHorizontal } from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { PriorityBadge, StatusBadge } from '@/components/common';
import { useIncidentStore } from '@/stores/incidentStore';
import { formatDate } from '@/config/appConfig';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

export default function Incidents() {
  const { incidents, config, updateIncident, filters, setFilters, clearFilters, getFilteredIncidents } = useIncidentStore();
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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

    return result.sort((a, b) => b.numero - a.numero);
  }, [getFilteredIncidents, search]);

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
            <Button asChild size="sm">
              <Link to="/nouveau">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Nouvel incident</span>
                <span className="sm:hidden">Nouveau</span>
              </Link>
            </Button>
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
                <Select 
                  value={filters.institution || ''} 
                  onValueChange={(v) => setFilters({ institution: v || undefined })}
                >
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Institution" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="">Toutes</SelectItem>
                    {config.institutions.map(inst => (
                      <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select 
                  value={filters.statut || ''} 
                  onValueChange={(v) => setFilters({ statut: v || undefined })}
                >
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="">Tous</SelectItem>
                    {config.statuts.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select 
                  value={filters.gravite || ''} 
                  onValueChange={(v) => setFilters({ gravite: v || undefined })}
                >
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Gravité" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="">Toutes</SelectItem>
                    {config.gravites.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={clearFilters} size="sm">
                  Effacer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile Cards View */}
        <div className="md:hidden space-y-3">
          {filteredIncidents.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucun incident trouvé
              </CardContent>
            </Card>
          ) : (
            filteredIncidents.map((incident) => (
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
                    <TableHead className="w-16">N°</TableHead>
                    <TableHead className="w-24">Date</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncidents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Aucun incident trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredIncidents.map((incident) => (
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
      </div>
    </AppLayout>
  );
}
