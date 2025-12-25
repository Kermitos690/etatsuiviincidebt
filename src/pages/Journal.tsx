import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, FileText, Eye, BookOpen, Sparkles, ArrowRight } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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
      <div className="p-4 md:p-8">
        <PageHeader 
          title="Journal chronologique" 
          description="Vue triée par date d'incident"
          icon={<BookOpen className="h-7 w-7 text-white" />}
          actions={
            <Button variant="glass" size="sm" className="hidden sm:flex">
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          }
        />

        {/* Search */}
        <div className="glass-card p-4 mb-6 animate-scale-in">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans les incidents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12 rounded-xl border-glass bg-secondary/30 focus:bg-background transition-all duration-300"
            />
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden space-y-4">
          {sortedIncidents.length === 0 ? (
            <div className="glass-card p-8 text-center animate-scale-in">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary/10 flex items-center justify-center mx-auto mb-4 animate-float">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground">Aucun incident trouvé</p>
            </div>
          ) : (
            sortedIncidents.map((incident, index) => (
              <div 
                key={incident.id}
                className="glass-card card-3d p-4 animate-scale-in group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-medium">
                        #{incident.numero}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(incident.dateIncident)}
                      </span>
                    </div>
                    <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                      {incident.titre}
                    </h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    asChild
                    className="rounded-xl hover:bg-primary/10 hover:text-primary"
                  >
                    <Link to={`/incidents/${incident.id}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-secondary/80 text-secondary-foreground">
                    {incident.institution}
                  </span>
                  <StatusBadge status={incident.statut} />
                  <PriorityBadge 
                    priority={incident.priorite} 
                    score={incident.score}
                    showTooltip={false}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block glass-card overflow-hidden animate-scale-in" style={{ animationDelay: '100ms' }}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-glass hover:bg-transparent">
                  <TableHead className="w-28 text-muted-foreground font-medium">Date</TableHead>
                  <TableHead className="w-20 text-muted-foreground font-medium">N°</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Institution</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Titre</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Type</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Statut</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Priorité</TableHead>
                  <TableHead className="w-16 text-muted-foreground font-medium">JP</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedIncidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-primary/10 flex items-center justify-center animate-float">
                          <BookOpen className="h-8 w-8 text-primary" />
                        </div>
                        <p className="text-muted-foreground">Aucun incident trouvé</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedIncidents.map((incident, index) => (
                    <TableRow 
                      key={incident.id} 
                      className={cn(
                        "border-b border-glass/50 hover:bg-secondary/30 transition-all duration-200",
                        "animate-slide-up"
                      )}
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {formatDate(incident.dateIncident)}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-medium px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-sm">
                          {incident.numero}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{incident.institution}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {incident.titre}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{incident.type}</TableCell>
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
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-sm">
                            <Sparkles className="h-3 w-3" />
                            Oui
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Non</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          asChild
                          className="rounded-xl hover:bg-primary/10 hover:text-primary"
                        >
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
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
