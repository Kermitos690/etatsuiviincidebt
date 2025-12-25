import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, FileText, Eye } from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { PriorityBadge, StatusBadge } from '@/components/common';
import { useIncidentStore } from '@/stores/incidentStore';
import { formatDate } from '@/config/appConfig';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function Journal() {
  const { incidents } = useIncidentStore();
  const [search, setSearch] = useState('');

  const sortedIncidents = useMemo(() => {
    let filtered = [...incidents];
    
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(i => 
        i.titre.toLowerCase().includes(s) ||
        i.faits.toLowerCase().includes(s) ||
        i.dysfonctionnement.toLowerCase().includes(s)
      );
    }

    return filtered.sort((a, b) => {
      const dateComp = b.dateIncident.localeCompare(a.dateIncident);
      if (dateComp !== 0) return dateComp;
      return b.numero - a.numero;
    });
  }, [incidents, search]);

  return (
    <AppLayout>
      <div className="p-6">
        <PageHeader 
          title="Journal chronologique" 
          description="Vue triée par date d'incident"
          actions={
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          }
        />

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans le journal..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Date</TableHead>
                  <TableHead className="w-16">N°</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead className="w-20">JP</TableHead>
                  <TableHead className="w-20">Preuves</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedIncidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Aucun incident trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedIncidents.map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell className="font-mono text-sm">
                        {formatDate(incident.dateIncident)}
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {incident.numero}
                      </TableCell>
                      <TableCell>{incident.institution}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {incident.titre}
                      </TableCell>
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
                        {incident.transmisJP ? (
                          <span className="text-green-600 font-medium">Oui</span>
                        ) : (
                          <span className="text-muted-foreground">Non</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {incident.preuves.length}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/incidents/${incident.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
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
