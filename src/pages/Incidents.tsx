import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Plus, Eye, Pencil, Send, FileText, MoreHorizontal, CalendarIcon, Download, ArrowUpDown, ArrowUp, ArrowDown, X, Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
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
import { supabase } from '@/integrations/supabase/client';
import type { Incident } from '@/types/incident';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  const { incidents, config, updateIncident, markTransmisJP: storeMarkTransmisJP, filters, setFilters, clearFilters, getFilteredIncidents, loadFromSupabase, isLoading } = useIncidentStore();
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateDebut, setDateDebut] = useState<Date | undefined>(undefined);
  const [dateFin, setDateFin] = useState<Date | undefined>(undefined);
  const [sortField, setSortField] = useState<SortField>('numero');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Multi-select states
  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([]);
  const [selectedStatuts, setSelectedStatuts] = useState<string[]>([]);
  const [selectedGravites, setSelectedGravites] = useState<string[]>([]);
  const [institutionOpen, setInstitutionOpen] = useState(false);
  const [statutOpen, setStatutOpen] = useState(false);
  const [graviteOpen, setGraviteOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState<string | null>(null);
  const [incidentToDelete, setIncidentToDelete] = useState<Incident | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load incidents from Supabase on mount
  useEffect(() => {
    loadFromSupabase();
  }, [loadFromSupabase]);
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
    setSelectedInstitutions([]);
    setSelectedStatuts([]);
    setSelectedGravites([]);
    setCurrentPage(1);
  };

  // Multi-select toggle functions
  const toggleInstitution = (value: string) => {
    const newValues = selectedInstitutions.includes(value)
      ? selectedInstitutions.filter(v => v !== value)
      : [...selectedInstitutions, value];
    setSelectedInstitutions(newValues);
    setCurrentPage(1);
  };

  const toggleStatut = (value: string) => {
    const newValues = selectedStatuts.includes(value)
      ? selectedStatuts.filter(v => v !== value)
      : [...selectedStatuts, value];
    setSelectedStatuts(newValues);
    setCurrentPage(1);
  };

  const toggleGravite = (value: string) => {
    const newValues = selectedGravites.includes(value)
      ? selectedGravites.filter(v => v !== value)
      : [...selectedGravites, value];
    setSelectedGravites(newValues);
    setCurrentPage(1);
  };

  // Export PDF for a single incident
  const exportIncidentPDF = useCallback(async (incident: Incident) => {
    setExportingPdf(incident.id);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      // Header
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('FICHE INCIDENT', margin, 28);
      doc.setFontSize(12);
      doc.text(`N° ${incident.numero}`, pageWidth - margin - 20, 28);

      y = 55;
      doc.setTextColor(0, 0, 0);

      // Info block
      const addField = (label: string, value: string, bold = false) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text(label, margin, y);
        doc.setFontSize(11);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(value || '-', margin + 45, y);
        y += 8;
      };

      addField('Date:', formatDate(incident.dateIncident));
      addField('Institution:', incident.institution);
      addField('Type:', incident.type);
      addField('Gravité:', incident.gravite);
      addField('Statut:', incident.statut);
      addField('Priorité:', `${incident.priorite} (Score: ${incident.score})`);
      addField('Transmis JP:', incident.transmisJP ? 'Oui' : 'Non');
      if (incident.dateTransmissionJP) {
        addField('Date transmission:', formatDate(incident.dateTransmissionJP));
      }

      y += 10;

      // Title
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, y, pageWidth - 2 * margin, 12, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('TITRE', margin + 4, y + 8);
      y += 18;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const titleLines = doc.splitTextToSize(incident.titre, pageWidth - 2 * margin);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 6 + 10;

      // Facts
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, y, pageWidth - 2 * margin, 12, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('FAITS', margin + 4, y + 8);
      y += 18;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const factsLines = doc.splitTextToSize(incident.faits, pageWidth - 2 * margin);
      doc.text(factsLines, margin, y);
      y += factsLines.length * 5 + 10;

      // Check page break
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      // Dysfonctionnement
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, y, pageWidth - 2 * margin, 12, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('DYSFONCTIONNEMENT', margin + 4, y + 8);
      y += 18;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const dysfLines = doc.splitTextToSize(incident.dysfonctionnement, pageWidth - 2 * margin);
      doc.text(dysfLines, margin, y);
      y += dysfLines.length * 5 + 10;

      // Preuves
      if (incident.preuves && incident.preuves.length > 0) {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        doc.setFillColor(243, 244, 246);
        doc.rect(margin, y, pageWidth - 2 * margin, 12, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('PREUVES', margin + 4, y + 8);
        y += 18;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        incident.preuves.forEach((preuve, index) => {
          doc.text(`${index + 1}. ${preuve.label} (${preuve.type})`, margin, y);
          y += 6;
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })} - Page ${i}/${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      doc.save(`incident_${incident.numero}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success(`PDF généré pour l'incident #${incident.numero}`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setExportingPdf(null);
    }
  }, []);

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

    // Apply multi-select filters
    if (selectedInstitutions.length > 0) {
      result = result.filter(i => selectedInstitutions.includes(i.institution));
    }
    if (selectedStatuts.length > 0) {
      result = result.filter(i => selectedStatuts.includes(i.statut));
    }
    if (selectedGravites.length > 0) {
      result = result.filter(i => selectedGravites.includes(i.gravite));
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
  }, [getFilteredIncidents, search, sortField, sortDirection, selectedInstitutions, selectedStatuts, selectedGravites]);

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

  const markTransmisJP = async (id: string) => {
    toast.loading('Transmission en cours...', { id: `transmis-${id}` });
    
    const result = await storeMarkTransmisJP(id);
    
    if (result.success) {
      if (result.emailError) {
        toast.warning('Transmis au JP, mais envoi email échoué', {
          id: `transmis-${id}`,
          description: result.emailError,
          duration: 8000
        });
      } else {
        toast.success('Incident transmis au Juge de Paix', {
          id: `transmis-${id}`,
          description: 'Le PDF a été envoyé par email'
        });
      }
    } else {
      toast.error('Échec de la transmission', {
        id: `transmis-${id}`,
        description: result.error
      });
    }
  };

  // Supprimer un incident avec feedback IA
  const deleteIncident = async (incident: Incident) => {
    setIsDeleting(true);
    try {
      // Récupérer l'utilisateur courant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return;
      }

      // Enregistrer le feedback pour l'IA (incident non pertinent)
      const { error: feedbackError } = await supabase.from('ai_training_feedback').insert({
        entity_id: incident.id,
        entity_type: 'incident',
        feedback_type: 'rejected',
        user_id: user.id,
        original_detection: {
          titre: incident.titre,
          institution: incident.institution,
          type: incident.type,
          gravite: incident.gravite,
          dysfonctionnement: incident.dysfonctionnement
        },
        notes: 'Incident supprimé manuellement - hors périmètre'
      });

      if (feedbackError) {
        console.error('Feedback error:', feedbackError);
        // Continuer même si le feedback échoue
      }

      // Supprimer l'incident
      const { error } = await supabase
        .from('incidents')
        .delete()
        .eq('id', incident.id);

      if (error) throw error;

      // Recharger les données pour mettre à jour l'affichage
      await loadFromSupabase();
      toast.success(`Incident #${incident.numero} supprimé et enregistré comme feedback IA`);
    } catch (error) {
      console.error('Error deleting incident:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
      setIncidentToDelete(null);
    }
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

                {/* Multi-select Institution */}
                <Popover open={institutionOpen} onOpenChange={setInstitutionOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={institutionOpen}
                      className="w-full sm:w-[180px] justify-between"
                    >
                      {selectedInstitutions.length === 0
                        ? "Institutions"
                        : `${selectedInstitutions.length} sélectionnée(s)`}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[220px] p-0 bg-popover z-50" align="start">
                    <Command>
                      <CommandInput placeholder="Rechercher..." />
                      <CommandList>
                        <CommandEmpty>Aucune institution trouvée.</CommandEmpty>
                        <CommandGroup>
                          {config.institutions.map((inst) => (
                            <CommandItem
                              key={inst}
                              value={inst}
                              onSelect={() => toggleInstitution(inst)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedInstitutions.includes(inst) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {inst}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Multi-select Statut */}
                <Popover open={statutOpen} onOpenChange={setStatutOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={statutOpen}
                      className="w-full sm:w-[160px] justify-between"
                    >
                      {selectedStatuts.length === 0
                        ? "Statuts"
                        : `${selectedStatuts.length} sélectionné(s)`}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[180px] p-0 bg-popover z-50" align="start">
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          {config.statuts.map((s) => (
                            <CommandItem
                              key={s}
                              value={s}
                              onSelect={() => toggleStatut(s)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedStatuts.includes(s) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {s}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Multi-select Gravité */}
                <Popover open={graviteOpen} onOpenChange={setGraviteOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={graviteOpen}
                      className="w-full sm:w-[160px] justify-between"
                    >
                      {selectedGravites.length === 0
                        ? "Gravités"
                        : `${selectedGravites.length} sélectionnée(s)`}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[180px] p-0 bg-popover z-50" align="start">
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          {config.gravites.map((g) => (
                            <CommandItem
                              key={g}
                              value={g}
                              onSelect={() => toggleGravite(g)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedGravites.includes(g) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {g}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Selected filters badges */}
                {(selectedInstitutions.length > 0 || selectedStatuts.length > 0 || selectedGravites.length > 0) && (
                  <div className="flex flex-wrap gap-1 w-full sm:w-auto">
                    {selectedInstitutions.map(inst => (
                      <Badge key={inst} variant="secondary" className="text-xs">
                        {inst}
                        <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => toggleInstitution(inst)} />
                      </Badge>
                    ))}
                    {selectedStatuts.map(s => (
                      <Badge key={s} variant="secondary" className="text-xs">
                        {s}
                        <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => toggleStatut(s)} />
                      </Badge>
                    ))}
                    {selectedGravites.map(g => (
                      <Badge key={g} variant="secondary" className="text-xs">
                        {g}
                        <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => toggleGravite(g)} />
                      </Badge>
                    ))}
                  </div>
                )}

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
                        <DropdownMenuItem 
                          onClick={() => exportIncidentPDF(incident)}
                          disabled={exportingPdf === incident.id}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          {exportingPdf === incident.id ? 'Export...' : 'Export PDF'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setIncidentToDelete(incident)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer (hors sujet)
                        </DropdownMenuItem>
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
                              <DropdownMenuItem 
                                onClick={() => exportIncidentPDF(incident)}
                                disabled={exportingPdf === incident.id}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                {exportingPdf === incident.id ? 'Export...' : 'Export PDF'}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setIncidentToDelete(incident)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer (hors sujet)
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!incidentToDelete} onOpenChange={(open) => !open && setIncidentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet incident ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'incident #{incidentToDelete?.numero} "{incidentToDelete?.titre}" sera supprimé définitivement. 
              Cette action entraînera également l'IA à ne plus détecter ce type de situation comme un incident.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => incidentToDelete && deleteIncident(incidentToDelete)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Suppression...' : 'Supprimer et entraîner l\'IA'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
