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
import { Checkbox } from '@/components/ui/checkbox';

export default function Incidents() {
  const { incidents, config, updateIncident, filters, setFilters, clearFilters, getFilteredIncidents } = useIncidentStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

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

  const toggleSelect = (id: string) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selected.length === filteredIncidents.length) {
      setSelected([]);
    } else {
      setSelected(filteredIncidents.map(i => i.id));
    }
  };

  const markTransmisJP = (id: string) => {
    updateIncident(id, { 
      transmisJP: true, 
      dateTransmissionJP: new Date().toISOString(),
      statut: 'Transmis'
    });
  };

  return (
    <AppLayout>
      <div className="p-6">
        <PageHeader 
          title="Liste des incidents" 
          description={`${incidents.length} incidents enregistrés`}
          actions={
            <Button asChild>
              <Link to="/nouveau">
                <Plus className="h-4 w-4 mr-2" />
                Nouvel incident
              </Link>
            </Button>
          }
        />

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select 
                value={filters.institution || ''} 
                onValueChange={(v) => setFilters({ institution: v || undefined })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Institution" />
                </SelectTrigger>
                <SelectContent>
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
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
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
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Gravité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Toutes</SelectItem>
                  {config.gravites.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={clearFilters}>
                <Filter className="h-4 w-4 mr-2" />
                Effacer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Selection actions */}
        {selected.length > 0 && (
          <div className="mb-4 p-3 bg-muted rounded-lg flex items-center gap-4">
            <span className="text-sm font-medium">{selected.length} sélectionné(s)</span>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selected.length === filteredIncidents.length && filteredIncidents.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
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
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Aucun incident trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIncidents.map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selected.includes(incident.id)}
                          onCheckedChange={() => toggleSelect(incident.id)}
                        />
                      </TableCell>
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
                          <DropdownMenuContent align="end">
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
                                Marquer transmis JP
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
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
