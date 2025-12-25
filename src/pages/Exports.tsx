import { useState } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIncidentStore } from '@/stores/incidentStore';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { formatDate } from '@/config/appConfig';

export default function Exports() {
  const { toast } = useToast();
  const { incidents } = useIncidentStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  const exportIncidentPDF = async () => {
    const incident = incidents.find(i => i.id === selectedIncident);
    if (!incident) return;

    setLoading('incident');
    
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text(`Incident #${incident.numero}`, 20, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Exporté le ${formatDate(new Date().toISOString())}`, 20, 28);
      
      doc.setTextColor(0);
      doc.setFontSize(12);
      
      let y = 45;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Titre:', 20, y);
      doc.setFont('helvetica', 'normal');
      const titleLines = doc.splitTextToSize(incident.titre, 130);
      doc.text(titleLines, 50, y);
      y += titleLines.length * 5 + 5;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Date:', 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(incident.dateIncident), 50, y);
      
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Institution:', 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(incident.institution, 50, y);
      
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Type:', 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(incident.type, 50, y);
      
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Gravité:', 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(incident.gravite, 50, y);
      
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Score:', 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${incident.score} (${incident.priorite})`, 50, y);
      
      y += 15;
      doc.setFont('helvetica', 'bold');
      doc.text('Faits constatés:', 20, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      const faitsLines = doc.splitTextToSize(incident.faits || 'Non renseigné', 170);
      doc.text(faitsLines, 20, y);
      y += faitsLines.length * 5 + 10;
      
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.text('Dysfonctionnement:', 20, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      const dysfLines = doc.splitTextToSize(incident.dysfonctionnement || 'Non renseigné', 170);
      doc.text(dysfLines, 20, y);
      
      doc.save(`incident-${incident.numero}.pdf`);
      
      toast({ title: "PDF généré", description: `incident-${incident.numero}.pdf` });
    } catch (error) {
      console.error('PDF error:', error);
      toast({ title: "Erreur", description: "Impossible de générer le PDF", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const exportJournalPDF = async () => {
    setLoading('journal');
    
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text('Journal des incidents', 20, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      const periode = dateDebut && dateFin 
        ? `Du ${formatDate(dateDebut)} au ${formatDate(dateFin)}`
        : 'Toutes les dates';
      doc.text(`${periode} - Exporté le ${formatDate(new Date().toISOString())}`, 20, 28);
      
      let filtered = incidents;
      if (dateDebut) filtered = filtered.filter(i => i.dateIncident >= dateDebut);
      if (dateFin) filtered = filtered.filter(i => i.dateIncident <= dateFin);
      
      doc.setTextColor(0);
      doc.setFontSize(9);
      
      let y = 45;
      
      doc.setFont('helvetica', 'bold');
      doc.text('N°', 20, y);
      doc.text('Date', 32, y);
      doc.text('Institution', 58, y);
      doc.text('Type', 100, y);
      doc.text('Gravité', 140, y);
      doc.text('Score', 170, y);
      
      y += 5;
      doc.line(20, y, 190, y);
      y += 5;
      
      doc.setFont('helvetica', 'normal');
      
      for (const inc of filtered.sort((a, b) => b.dateIncident.localeCompare(a.dateIncident))) {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        
        doc.text(String(inc.numero), 20, y);
        doc.text(formatDate(inc.dateIncident), 32, y);
        doc.text(inc.institution.substring(0, 15), 58, y);
        doc.text(inc.type.substring(0, 15), 100, y);
        doc.text(inc.gravite, 140, y);
        doc.text(String(inc.score), 170, y);
        
        y += 6;
      }
      
      doc.save('journal-incidents.pdf');
      
      toast({ title: "PDF généré", description: "journal-incidents.pdf" });
    } catch (error) {
      console.error('PDF error:', error);
      toast({ title: "Erreur", description: "Impossible de générer le PDF", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const exportRapport6Mois = async () => {
    setLoading('rapport');
    
    try {
      const doc = new jsPDF();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const filtered = incidents.filter(i => new Date(i.dateIncident) >= sixMonthsAgo);
      
      doc.setFontSize(18);
      doc.text('Rapport semestriel', 20, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Période: 6 derniers mois - ${formatDate(new Date().toISOString())}`, 20, 28);
      
      doc.setTextColor(0);
      let y = 45;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Statistiques', 20, y);
      y += 10;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total incidents: ${filtered.length}`, 20, y);
      y += 7;
      doc.text(`Ouverts: ${filtered.filter(i => i.statut === 'Ouvert').length}`, 20, y);
      y += 7;
      doc.text(`Transmis JP: ${filtered.filter(i => i.transmisJP).length}`, 20, y);
      y += 7;
      const avgScore = filtered.length > 0 
        ? Math.round(filtered.reduce((a, i) => a + i.score, 0) / filtered.length * 10) / 10
        : 0;
      doc.text(`Score moyen: ${avgScore}`, 20, y);
      
      y += 15;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Par institution', 20, y);
      y += 10;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const byInst: Record<string, number> = {};
      filtered.forEach(i => { byInst[i.institution] = (byInst[i.institution] || 0) + 1; });
      Object.entries(byInst).sort((a, b) => b[1] - a[1]).forEach(([inst, count]) => {
        doc.text(`${inst}: ${count}`, 20, y);
        y += 6;
      });
      
      y += 10;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Top 5 par score', 20, y);
      y += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      filtered
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .forEach((inc, i) => {
          const line = `${i + 1}. #${inc.numero} - ${inc.titre.substring(0, 40)}... (Score: ${inc.score})`;
          doc.text(line, 20, y);
          y += 6;
        });
      
      doc.save('rapport-6-mois.pdf');
      
      toast({ title: "PDF généré", description: "rapport-6-mois.pdf" });
    } catch (error) {
      console.error('PDF error:', error);
      toast({ title: "Erreur", description: "Impossible de générer le PDF", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl">
        <PageHeader 
          title="Exports PDF" 
          description="Générez des rapports"
        />

        <div className="grid gap-4 md:gap-6">
          {/* Export incident unique */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Fiche incident
              </CardTitle>
              <CardDescription className="text-sm">
                Export d'un incident unique
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Sélectionner un incident</Label>
                <Select value={selectedIncident} onValueChange={setSelectedIncident}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50 max-h-[200px]">
                    {incidents.map(inc => (
                      <SelectItem key={inc.id} value={inc.id}>
                        #{inc.numero} - {inc.titre.substring(0, 30)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={exportIncidentPDF} 
                disabled={!selectedIncident || loading === 'incident'}
                size="sm"
              >
                {loading === 'incident' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Télécharger
              </Button>
            </CardContent>
          </Card>

          {/* Export journal */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Journal filtré
              </CardTitle>
              <CardDescription className="text-sm">
                Export avec filtres de dates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Date début</Label>
                  <Input 
                    type="date" 
                    value={dateDebut} 
                    onChange={(e) => setDateDebut(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Date fin</Label>
                  <Input 
                    type="date" 
                    value={dateFin} 
                    onChange={(e) => setDateFin(e.target.value)} 
                  />
                </div>
              </div>
              <Button onClick={exportJournalPDF} disabled={loading === 'journal'} size="sm">
                {loading === 'journal' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Télécharger Journal
              </Button>
            </CardContent>
          </Card>

          {/* Rapport 6 mois */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Rapport semestriel
              </CardTitle>
              <CardDescription className="text-sm">
                Synthèse des 6 derniers mois
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={exportRapport6Mois} disabled={loading === 'rapport'} size="sm">
                {loading === 'rapport' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Télécharger Rapport
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
