import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, FileText, Eye, BookOpen, Sparkles, ArrowRight, Loader2, Download, Filter, X, CalendarIcon } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function Journal() {
  const { incidents, loadFromSupabase, config } = useIncidentStore();
  const [search, setSearch] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced filters
  const [dateStart, setDateStart] = useState<Date | undefined>(undefined);
  const [dateEnd, setDateEnd] = useState<Date | undefined>(undefined);
  const [filterInstitution, setFilterInstitution] = useState<string>('');
  const [filterStatut, setFilterStatut] = useState<string>('');
  const [filterGravite, setFilterGravite] = useState<string>('');

  useEffect(() => {
    loadFromSupabase();
  }, [loadFromSupabase]);

  // Get unique values from incidents
  const uniqueInstitutions = useMemo(() => {
    const institutions = [...new Set(incidents.map(i => i.institution))];
    return institutions.sort();
  }, [incidents]);

  const uniqueStatuts = useMemo(() => {
    const statuts = [...new Set(incidents.map(i => i.statut))];
    return statuts.sort();
  }, [incidents]);

  const uniqueGravites = useMemo(() => {
    const gravites = [...new Set(incidents.map(i => i.gravite))];
    return gravites.sort();
  }, [incidents]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (dateStart) count++;
    if (dateEnd) count++;
    if (filterInstitution) count++;
    if (filterStatut) count++;
    if (filterGravite) count++;
    return count;
  }, [dateStart, dateEnd, filterInstitution, filterStatut, filterGravite]);

  const clearAllFilters = () => {
    setDateStart(undefined);
    setDateEnd(undefined);
    setFilterInstitution('');
    setFilterStatut('');
    setFilterGravite('');
    setSearch('');
  };

  const sortedIncidents = useMemo(() => {
    let filtered = [...incidents];
    
    // Text search
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(i => 
        i.titre.toLowerCase().includes(s) ||
        i.faits.toLowerCase().includes(s) ||
        i.dysfonctionnement.toLowerCase().includes(s)
      );
    }

    // Date filters
    if (dateStart) {
      const startStr = format(dateStart, 'yyyy-MM-dd');
      filtered = filtered.filter(i => i.dateIncident >= startStr);
    }
    if (dateEnd) {
      const endStr = format(dateEnd, 'yyyy-MM-dd');
      filtered = filtered.filter(i => i.dateIncident <= endStr);
    }

    // Institution filter
    if (filterInstitution) {
      filtered = filtered.filter(i => i.institution === filterInstitution);
    }

    // Statut filter
    if (filterStatut) {
      filtered = filtered.filter(i => i.statut === filterStatut);
    }

    // Gravité filter
    if (filterGravite) {
      filtered = filtered.filter(i => i.gravite === filterGravite);
    }

    return filtered.sort((a, b) => {
      const dateComp = b.dateIncident.localeCompare(a.dateIncident);
      if (dateComp !== 0) return dateComp;
      return b.numero - a.numero;
    });
  }, [incidents, search, dateStart, dateEnd, filterInstitution, filterStatut, filterGravite]);

  // Export Journal to PDF with rich visuals
  const exportJournalPDF = useCallback(async () => {
    setExportingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let y = 15;

      // Color helpers (RGB)
      const colors = {
        primary: [37, 99, 235],
        secondary: [139, 92, 246],
        success: [34, 197, 94],
        warning: [251, 191, 36],
        danger: [239, 68, 68],
        orange: [249, 115, 22],
        cyan: [6, 182, 212],
        pink: [236, 72, 153],
        slate: [100, 116, 139],
        dark: [30, 41, 59]
      };

      const setColor = (color: number[], type: 'fill' | 'text' | 'draw' = 'fill') => {
        if (type === 'fill') doc.setFillColor(color[0], color[1], color[2]);
        else if (type === 'text') doc.setTextColor(color[0], color[1], color[2]);
        else doc.setDrawColor(color[0], color[1], color[2]);
      };

      const addPageIfNeeded = (requiredSpace: number) => {
        if (y + requiredSpace > pageHeight - 20) {
          doc.addPage();
          y = 25;
          return true;
        }
        return false;
      };

      // === HEADER ===
      setColor(colors.primary, 'fill');
      doc.rect(0, 0, pageWidth, 45, 'F');
      setColor(colors.secondary, 'fill');
      doc.rect(pageWidth - 50, 0, 50, 45, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('JOURNAL CHRONOLOGIQUE', margin, 22);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Registre des Incidents - Liste Détaillée', margin, 34);
      
      // Date badge
      doc.setFontSize(9);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(pageWidth - 45, 8, 35, 14, 3, 3, 'F');
      setColor(colors.primary, 'text');
      doc.text(format(new Date(), "dd MMM yyyy", { locale: fr }), pageWidth - 42, 17);
      
      y = 55;

      // === STATISTICS SUMMARY ===
      const totalIncidents = sortedIncidents.length;
      const openIncidents = sortedIncidents.filter(i => i.statut === 'Ouvert').length;
      const transmisJP = sortedIncidents.filter(i => i.transmisJP).length;
      const avgScore = totalIncidents > 0 
        ? Math.round(sortedIncidents.reduce((acc, i) => acc + i.score, 0) / totalIncidents * 10) / 10 
        : 0;

      const stats = [
        { label: 'Total', value: totalIncidents, color: colors.primary },
        { label: 'Ouverts', value: openIncidents, color: colors.warning },
        { label: 'Transmis JP', value: transmisJP, color: colors.secondary },
        { label: 'Score moy.', value: avgScore, color: colors.success }
      ];

      const cardWidth = (pageWidth - 2 * margin - 12) / 4;
      stats.forEach((stat, idx) => {
        const x = margin + idx * (cardWidth + 4);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, cardWidth, 22, 3, 3, 'F');
        setColor(stat.color, 'fill');
        doc.roundedRect(x, y, cardWidth, 4, 3, 3, 'F');
        doc.rect(x, y + 2, cardWidth, 2, 'F');
        
        setColor(colors.dark, 'text');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(String(stat.value), x + cardWidth / 2, y + 13, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(stat.label, x + cardWidth / 2, y + 19, { align: 'center' });
      });
      y += 32;

      // === TABLE HEADER ===
      setColor(colors.dark, 'fill');
      doc.roundedRect(margin, y, pageWidth - 2 * margin, 10, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('Date', margin + 3, y + 7);
      doc.text('N°', margin + 25, y + 7);
      doc.text('Institution', margin + 38, y + 7);
      doc.text('Titre', margin + 75, y + 7);
      doc.text('Type', margin + 120, y + 7);
      doc.text('Statut', margin + 150, y + 7);
      doc.text('Score', margin + 172, y + 7);
      y += 12;

      // === TABLE ROWS ===
      sortedIncidents.forEach((inc, idx) => {
        addPageIfNeeded(14);
        
        const bgColor = idx % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        setColor(colors.slate, 'draw');
        doc.roundedRect(margin, y, pageWidth - 2 * margin, 12, 1, 1, 'FD');
        
        // Date
        setColor(colors.slate, 'text');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDate(inc.dateIncident), margin + 3, y + 7);
        
        // Number badge
        setColor(colors.primary, 'fill');
        doc.roundedRect(margin + 22, y + 2, 12, 8, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.text(String(inc.numero), margin + 28, y + 7, { align: 'center' });
        
        // Institution
        setColor(colors.dark, 'text');
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        const institution = inc.institution.length > 18 ? inc.institution.substring(0, 15) + '...' : inc.institution;
        doc.text(institution, margin + 38, y + 7);
        
        // Title
        doc.setFont('helvetica', 'bold');
        const titre = inc.titre.length > 25 ? inc.titre.substring(0, 22) + '...' : inc.titre;
        doc.text(titre, margin + 75, y + 7);
        
        // Type
        doc.setFont('helvetica', 'normal');
        const type = inc.type.length > 15 ? inc.type.substring(0, 12) + '...' : inc.type;
        doc.text(type, margin + 120, y + 7);
        
        // Status badge
        const statusColors: Record<string, number[]> = {
          'Ouvert': colors.warning,
          'En cours': colors.primary,
          'Résolu': colors.success,
          'Transmis': colors.secondary,
          'Classé': colors.slate
        };
        const statusColor = statusColors[inc.statut] || colors.slate;
        setColor(statusColor, 'fill');
        doc.roundedRect(margin + 147, y + 2, 20, 8, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(5);
        const statut = inc.statut.length > 10 ? inc.statut.substring(0, 8) + '..' : inc.statut;
        doc.text(statut, margin + 157, y + 7, { align: 'center' });
        
        // Score badge
        const scoreColor = inc.score >= 70 ? colors.danger : inc.score >= 50 ? colors.orange : colors.success;
        setColor(scoreColor, 'fill');
        doc.roundedRect(margin + 170, y + 2, 14, 8, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.text(String(inc.score), margin + 177, y + 7, { align: 'center' });
        
        y += 13;
      });

      // === FOOTER on all pages ===
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(248, 250, 252);
        doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
        setColor(colors.slate, 'text');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Journal des Incidents | Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })} | Page ${i}/${pageCount}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }

      doc.save('journal_incidents_' + format(new Date(), 'yyyy-MM-dd_HHmm') + '.pdf');
      toast.success('Journal exporté en PDF');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setExportingPdf(false);
    }
  }, [sortedIncidents]);

  return (
    <AppLayout>
      <div className="p-4 md:p-8">
        <PageHeader 
          title="Journal chronologique" 
          description="Vue triée par date d'incident"
          icon={<BookOpen className="h-7 w-7 text-white" />}
          actions={
            <Button 
              variant="glass" 
              size="sm" 
              className="hidden sm:flex"
              onClick={exportJournalPDF}
              disabled={exportingPdf || sortedIncidents.length === 0}
            >
              {exportingPdf ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Export PDF
            </Button>
          }
        />

        {/* Search & Filters */}
        <div className="glass-card p-4 mb-6 animate-scale-in space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans les incidents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-12 rounded-xl border-glass bg-secondary/30 focus:bg-background transition-all duration-300"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="h-12 px-4"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtres
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 bg-primary text-primary-foreground">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="border-t border-glass pt-4 animate-scale-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">Filtres avancés</h3>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Effacer tout
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Date Start */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Date début</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-10",
                          !dateStart && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateStart ? format(dateStart, "dd/MM/yyyy", { locale: fr }) : "Sélectionner"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateStart}
                        onSelect={setDateStart}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Date End */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Date fin</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-10",
                          !dateEnd && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateEnd ? format(dateEnd, "dd/MM/yyyy", { locale: fr }) : "Sélectionner"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateEnd}
                        onSelect={setDateEnd}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Institution */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Institution</label>
                  <Select value={filterInstitution || "all"} onValueChange={(val) => setFilterInstitution(val === "all" ? "" : val)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      {uniqueInstitutions.filter(inst => inst).map((inst) => (
                        <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Statut */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Statut</label>
                  <Select value={filterStatut || "all"} onValueChange={(val) => setFilterStatut(val === "all" ? "" : val)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {uniqueStatuts.filter(statut => statut).map((statut) => (
                        <SelectItem key={statut} value={statut}>{statut}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Gravité */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Gravité</label>
                  <Select value={filterGravite || "all"} onValueChange={(val) => setFilterGravite(val === "all" ? "" : val)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      {uniqueGravites.filter(gravite => gravite).map((gravite) => (
                        <SelectItem key={gravite} value={gravite}>{gravite}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active filters badges */}
              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-glass">
                  {dateStart && (
                    <Badge variant="secondary" className="gap-1">
                      Début: {format(dateStart, "dd/MM/yyyy", { locale: fr })}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setDateStart(undefined)} />
                    </Badge>
                  )}
                  {dateEnd && (
                    <Badge variant="secondary" className="gap-1">
                      Fin: {format(dateEnd, "dd/MM/yyyy", { locale: fr })}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setDateEnd(undefined)} />
                    </Badge>
                  )}
                  {filterInstitution && (
                    <Badge variant="secondary" className="gap-1">
                      {filterInstitution}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterInstitution('')} />
                    </Badge>
                  )}
                  {filterStatut && (
                    <Badge variant="secondary" className="gap-1">
                      {filterStatut}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterStatut('')} />
                    </Badge>
                  )}
                  {filterGravite && (
                    <Badge variant="secondary" className="gap-1">
                      {filterGravite}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterGravite('')} />
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            {sortedIncidents.length} incident{sortedIncidents.length !== 1 ? 's' : ''} trouvé{sortedIncidents.length !== 1 ? 's' : ''}
            {activeFiltersCount > 0 && ` (${activeFiltersCount} filtre${activeFiltersCount > 1 ? 's' : ''} actif${activeFiltersCount > 1 ? 's' : ''})`}
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden space-y-4">
          {/* Mobile Export Button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mb-4"
            onClick={exportJournalPDF}
            disabled={exportingPdf || sortedIncidents.length === 0}
          >
            {exportingPdf ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exporter en PDF
          </Button>
          
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
