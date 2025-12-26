import { useState } from 'react';
import { FileText, Download, Loader2, BookOpen, Calendar, Scale, FolderArchive, AlertTriangle } from 'lucide-react';
import { AppLayout, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIncidentStore } from '@/stores/incidentStore';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import { formatDate } from '@/config/appConfig';

export default function Exports() {
  const { toast } = useToast();
  const { incidents } = useIncidentStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  // Fetch thread analyses for timeline export
  const { data: threadAnalyses } = useQuery({
    queryKey: ['thread-analyses-export'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('thread_analyses')
        .select('*')
        .order('analyzed_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch emails for complete dossier
  const { data: emails } = useQuery({
    queryKey: ['emails-export'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    }
  });

  // Export single incident with complete dossier
  const exportIncidentCompletePDF = async () => {
    const incident = incidents.find(i => i.id === selectedIncident);
    if (!incident) return;

    setLoading('incident-complete');
    
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(`DOSSIER INCIDENT #${incident.numero}`, 20, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Généré le ${formatDate(new Date().toISOString())} - Document confidentiel`, 20, 28);
      doc.text('Système d\'Audit Juridique - Protection de l\'Adulte', 20, 34);
      
      doc.line(20, 38, 190, 38);
      
      doc.setTextColor(0);
      let y = 48;
      
      // Section 1: Informations générales
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('1. INFORMATIONS GÉNÉRALES', 20, y);
      y += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const info = [
        ['Titre', incident.titre],
        ['Date de l\'incident', formatDate(incident.dateIncident)],
        ['Date de création', formatDate(incident.dateCreation)],
        ['Institution', incident.institution],
        ['Type', incident.type],
        ['Gravité', incident.gravite],
        ['Priorité', incident.priorite],
        ['Score', `${incident.score}/100`],
        ['Statut', incident.statut],
        ['Transmis JP', incident.transmisJP ? 'Oui' : 'Non'],
      ];
      
      info.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, 25, y);
        doc.setFont('helvetica', 'normal');
        const valueLines = doc.splitTextToSize(String(value), 120);
        doc.text(valueLines, 60, y);
        y += valueLines.length * 5 + 2;
      });
      
      y += 5;
      
      // Section 2: Faits constatés
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('2. FAITS CONSTATÉS', 20, y);
      y += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const faitsLines = doc.splitTextToSize(incident.faits || 'Non renseigné', 165);
      if (y + faitsLines.length * 5 > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(faitsLines, 25, y);
      y += faitsLines.length * 5 + 10;
      
      // Section 3: Dysfonctionnement
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('3. DYSFONCTIONNEMENT IDENTIFIÉ', 20, y);
      y += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const dysfLines = doc.splitTextToSize(incident.dysfonctionnement || 'Non renseigné', 165);
      doc.text(dysfLines, 25, y);
      y += dysfLines.length * 5 + 10;
      
      // Section 4: Bases légales (if available)
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('4. BASES LÉGALES APPLICABLES', 20, y);
      y += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const legalBases = [
        'Art. 388-456 CC - Protection de l\'adulte',
        'Art. 29 Cst. - Garanties de procédure',
        'Art. 26-35 PA - Procédure administrative',
        'Art. 6, 25, 30 LPD - Protection des données',
        'LVPAE (VD) - Loi cantonale d\'application',
      ];
      
      legalBases.forEach(base => {
        doc.text(`• ${base}`, 25, y);
        y += 5;
      });
      
      y += 5;
      
      // Section 5: Preuves
      if (incident.preuves && Array.isArray(incident.preuves) && incident.preuves.length > 0) {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('5. PREUVES RÉFÉRENCÉES', 20, y);
        y += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        (incident.preuves as any[]).forEach((preuve, idx) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(`${idx + 1}. ${preuve.type || 'Document'}: ${preuve.description || 'Sans description'}`, 25, y);
          y += 5;
        });
      }
      
      // Footer on all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i}/${pageCount} - Dossier Incident #${incident.numero} - Confidentiel`, 20, 290);
      }
      
      doc.save(`dossier-incident-${incident.numero}.pdf`);
      
      toast({ title: "Dossier PDF généré", description: `dossier-incident-${incident.numero}.pdf` });
    } catch (error) {
      console.error('PDF error:', error);
      toast({ title: "Erreur", description: "Impossible de générer le PDF", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  // Export basic incident
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

  // Export journal with filters
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

  // Export 6-month report
  const exportRapport6Mois = async () => {
    setLoading('rapport');
    
    try {
      const doc = new jsPDF();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const filtered = incidents.filter(i => new Date(i.dateIncident) >= sixMonthsAgo);
      
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('RAPPORT SEMESTRIEL', 20, 20);
      doc.text('Audit Protection de l\'Adulte', 20, 30);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Période: ${formatDate(sixMonthsAgo.toISOString())} au ${formatDate(new Date().toISOString())}`, 20, 38);
      
      doc.line(20, 42, 190, 42);
      
      doc.setTextColor(0);
      let y = 52;
      
      // Executive Summary
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('1. RÉSUMÉ EXÉCUTIF', 20, y);
      y += 10;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total incidents: ${filtered.length}`, 25, y);
      y += 7;
      doc.text(`Ouverts: ${filtered.filter(i => i.statut === 'Ouvert').length}`, 25, y);
      y += 7;
      doc.text(`Transmis JP: ${filtered.filter(i => i.transmisJP).length}`, 25, y);
      y += 7;
      
      const avgScore = filtered.length > 0 
        ? Math.round(filtered.reduce((a, i) => a + i.score, 0) / filtered.length * 10) / 10
        : 0;
      doc.text(`Score moyen: ${avgScore}/100`, 25, y);
      y += 7;
      
      const critiques = filtered.filter(i => i.gravite === 'Critique').length;
      doc.text(`Incidents critiques: ${critiques}`, 25, y);
      
      y += 15;
      
      // By institution
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('2. RÉPARTITION PAR INSTITUTION', 20, y);
      y += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const byInst: Record<string, number> = {};
      filtered.forEach(i => { byInst[i.institution] = (byInst[i.institution] || 0) + 1; });
      Object.entries(byInst).sort((a, b) => b[1] - a[1]).forEach(([inst, count]) => {
        doc.text(`• ${inst}: ${count} incident(s)`, 25, y);
        y += 6;
      });
      
      y += 10;
      
      // By severity
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('3. RÉPARTITION PAR GRAVITÉ', 20, y);
      y += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const byGravite: Record<string, number> = {};
      filtered.forEach(i => { byGravite[i.gravite] = (byGravite[i.gravite] || 0) + 1; });
      Object.entries(byGravite).forEach(([grav, count]) => {
        doc.text(`• ${grav}: ${count}`, 25, y);
        y += 6;
      });
      
      y += 10;
      
      // Top 5 by score
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('4. TOP 5 PAR SCORE', 20, y);
      y += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      filtered
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .forEach((inc, i) => {
          const line = `${i + 1}. #${inc.numero} - ${inc.titre.substring(0, 45)}... (Score: ${inc.score})`;
          doc.text(line, 25, y);
          y += 6;
        });
      
      // New page for legal analysis
      doc.addPage();
      y = 20;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('5. BASES LÉGALES FRÉQUEMMENT VIOLÉES', 20, y);
      y += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const legalIssues = [
        'Art. 404 CC - Défaut de collaboration avec le pupille',
        'Art. 406 CC - Non-respect de l\'avis du pupille',
        'Art. 29 Cst. - Violation des garanties de procédure',
        'Art. 35 PA - Décisions non motivées',
        'Art. 30 LPD - Communication sans consentement',
      ];
      legalIssues.forEach(issue => {
        doc.text(`• ${issue}`, 25, y);
        y += 6;
      });
      
      y += 10;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('6. RECOMMANDATIONS', 20, y);
      y += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const recommendations = [
        'Renforcer la formation des curateurs sur la collaboration (Art. 404 CC)',
        'Mettre en place un système de traçabilité des décisions',
        'Améliorer les délais de réponse aux demandes',
        'Vérifier systématiquement le consentement avant communication à tiers',
        'Documenter toutes les consultations du pupille',
      ];
      recommendations.forEach((rec, i) => {
        const recLines = doc.splitTextToSize(`${i + 1}. ${rec}`, 165);
        doc.text(recLines, 25, y);
        y += recLines.length * 5 + 2;
      });
      
      doc.save('rapport-semestriel.pdf');
      
      toast({ title: "PDF généré", description: "rapport-semestriel.pdf" });
    } catch (error) {
      console.error('PDF error:', error);
      toast({ title: "Erreur", description: "Impossible de générer le PDF", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  // Export violations timeline
  const exportViolationsTimeline = async () => {
    setLoading('violations');
    
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('CHRONOLOGIE DES VIOLATIONS', 20, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Généré le ${formatDate(new Date().toISOString())}`, 20, 28);
      
      doc.line(20, 32, 190, 32);
      
      doc.setTextColor(0);
      let y = 42;
      
      if (threadAnalyses && threadAnalyses.length > 0) {
        threadAnalyses
          .filter(t => (t.detected_issues as any[])?.length > 0)
          .sort((a, b) => new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime())
          .slice(0, 30)
          .forEach((analysis, idx) => {
            if (y > 260) {
              doc.addPage();
              y = 20;
            }
            
            const issues = analysis.detected_issues as any[];
            const date = new Date(analysis.analyzed_at).toLocaleDateString('fr-CH');
            
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`${idx + 1}. Thread analysé le ${date}`, 20, y);
            y += 6;
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Sévérité: ${analysis.severity || 'N/A'} | Confiance: ${Math.round((analysis.confidence_score || 0) * 100)}%`, 25, y);
            y += 5;
            
            issues?.slice(0, 3).forEach((issue: any) => {
              const issueText = `• [${issue.type}] ${issue.description?.substring(0, 80) || 'Sans description'}...`;
              doc.text(issueText, 30, y);
              y += 5;
            });
            
            y += 5;
          });
      } else {
        doc.text('Aucune analyse de thread disponible.', 20, y);
      }
      
      doc.save('chronologie-violations.pdf');
      
      toast({ title: "PDF généré", description: "chronologie-violations.pdf" });
    } catch (error) {
      console.error('PDF error:', error);
      toast({ title: "Erreur", description: "Impossible de générer le PDF", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  // Export probative dossier for JP
  const exportDossierProbatoire = async () => {
    setLoading('probatoire');
    
    try {
      const doc = new jsPDF();
      
      // Cover page
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('DOSSIER PROBATOIRE', 105, 80, { align: 'center' });
      
      doc.setFontSize(16);
      doc.text('Transmission au Juge de Paix', 105, 95, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${formatDate(new Date().toISOString())}`, 105, 120, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('Document généré automatiquement par le Système d\'Audit Juridique', 105, 140, { align: 'center' });
      doc.text('Protection de l\'Adulte - Canton de Vaud', 105, 148, { align: 'center' });
      
      doc.line(40, 160, 170, 160);
      
      doc.setTextColor(0);
      doc.setFontSize(9);
      doc.text('Ce dossier contient les preuves collectées et analysées concernant', 105, 175, { align: 'center' });
      doc.text('des manquements potentiels dans l\'exercice de mandats de curatelle.', 105, 182, { align: 'center' });
      
      // Table of contents
      doc.addPage();
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('TABLE DES MATIÈRES', 20, 20);
      
      let y = 35;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      const toc = [
        '1. Résumé exécutif',
        '2. Liste des incidents transmis',
        '3. Chronologie des faits',
        '4. Bases légales violées',
        '5. Preuves documentaires',
        '6. Recommandations',
      ];
      
      toc.forEach(item => {
        doc.text(item, 25, y);
        y += 8;
      });
      
      // Section 1: Executive summary
      doc.addPage();
      y = 20;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('1. RÉSUMÉ EXÉCUTIF', 20, y);
      y += 12;
      
      const transmisJP = incidents.filter(i => i.transmisJP);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nombre total d'incidents signalés: ${incidents.length}`, 25, y);
      y += 6;
      doc.text(`Incidents transmis au Juge de Paix: ${transmisJP.length}`, 25, y);
      y += 6;
      
      const critiques = incidents.filter(i => i.gravite === 'Critique').length;
      const hauts = incidents.filter(i => i.gravite === 'Haute').length;
      doc.text(`Incidents critiques: ${critiques} | Incidents haute gravité: ${hauts}`, 25, y);
      y += 12;
      
      // Section 2: List of transmitted incidents
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('2. INCIDENTS TRANSMIS AU JUGE DE PAIX', 20, y);
      y += 10;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      if (transmisJP.length > 0) {
        transmisJP.forEach((inc, idx) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          
          doc.setFont('helvetica', 'bold');
          doc.text(`${idx + 1}. Incident #${inc.numero} - ${inc.titre.substring(0, 50)}...`, 25, y);
          y += 5;
          
          doc.setFont('helvetica', 'normal');
          doc.text(`Date: ${formatDate(inc.dateIncident)} | Institution: ${inc.institution} | Gravité: ${inc.gravite}`, 30, y);
          y += 5;
          doc.text(`Score: ${inc.score}/100`, 30, y);
          y += 8;
        });
      } else {
        doc.text('Aucun incident transmis au Juge de Paix.', 25, y);
        y += 10;
      }
      
      // Section 3: Legal bases
      doc.addPage();
      y = 20;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('4. BASES LÉGALES APPLICABLES', 20, y);
      y += 12;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      const legalBases = [
        { code: 'CC', articles: 'Art. 388-456', desc: 'Protection de l\'adulte' },
        { code: 'Cst.', articles: 'Art. 29', desc: 'Garanties de procédure' },
        { code: 'PA', articles: 'Art. 26, 29, 35', desc: 'Procédure administrative' },
        { code: 'LPD', articles: 'Art. 6, 25, 30', desc: 'Protection des données' },
        { code: 'LVPAE', articles: 'Art. 1-31', desc: 'Loi cantonale VD' },
        { code: 'CP', articles: 'Art. 312, 314, 321', desc: 'Infractions fonction publique' },
      ];
      
      legalBases.forEach(base => {
        doc.text(`• ${base.code} ${base.articles}: ${base.desc}`, 25, y);
        y += 6;
      });
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i}/${pageCount} - Dossier Probatoire - Confidentiel`, 105, 290, { align: 'center' });
      }
      
      doc.save('dossier-probatoire-jp.pdf');
      
      toast({ title: "Dossier probatoire généré", description: "dossier-probatoire-jp.pdf" });
    } catch (error) {
      console.error('PDF error:', error);
      toast({ title: "Erreur", description: "Impossible de générer le PDF", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-5xl">
        <PageHeader 
          title="Exports PDF" 
          description="Générez des rapports et dossiers probatoires"
        />

        <Tabs defaultValue="incidents" className="space-y-4">
          <TabsList className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <TabsTrigger value="incidents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Incidents</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Rapports</span>
            </TabsTrigger>
            <TabsTrigger value="violations" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              <span className="hidden sm:inline">Violations</span>
            </TabsTrigger>
            <TabsTrigger value="probatoire" className="flex items-center gap-2">
              <FolderArchive className="h-4 w-4" />
              <span className="hidden sm:inline">Probatoire</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incidents" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Complete incident dossier */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderArchive className="h-5 w-5" />
                    Dossier incident complet
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Export avec bases légales et preuves
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
                    onClick={exportIncidentCompletePDF} 
                    disabled={!selectedIncident || loading === 'incident-complete'}
                    className="w-full"
                  >
                    {loading === 'incident-complete' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Dossier Complet
                  </Button>
                </CardContent>
              </Card>

              {/* Basic incident export */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Fiche incident simple
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Export rapide d'un incident
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Incident</Label>
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
                    variant="outline"
                    className="w-full"
                  >
                    {loading === 'incident' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Fiche Simple
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Journal with filters */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Journal filtré
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Export avec filtres de dates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-sm">Début</Label>
                      <Input 
                        type="date" 
                        value={dateDebut} 
                        onChange={(e) => setDateDebut(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Fin</Label>
                      <Input 
                        type="date" 
                        value={dateFin} 
                        onChange={(e) => setDateFin(e.target.value)} 
                      />
                    </div>
                  </div>
                  <Button onClick={exportJournalPDF} disabled={loading === 'journal'} className="w-full">
                    {loading === 'journal' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Télécharger Journal
                  </Button>
                </CardContent>
              </Card>

              {/* 6-month report */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Rapport semestriel
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Synthèse avec recommandations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">{incidents.length} incidents</Badge>
                    <Badge variant="outline">6 derniers mois</Badge>
                  </div>
                  <Button onClick={exportRapport6Mois} disabled={loading === 'rapport'} className="w-full">
                    {loading === 'rapport' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Générer Rapport
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="violations" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Chronologie des violations
                </CardTitle>
                <CardDescription className="text-sm">
                  Timeline des problèmes détectés par l'IA avec citations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary">{threadAnalyses?.length || 0} analyses</Badge>
                  <Badge variant="outline">
                    {threadAnalyses?.filter(t => (t.detected_issues as any[])?.length > 0).length || 0} avec problèmes
                  </Badge>
                </div>
                <Button onClick={exportViolationsTimeline} disabled={loading === 'violations'} className="w-full">
                  {loading === 'violations' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Exporter Chronologie
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="probatoire" className="space-y-4">
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  Dossier probatoire pour le Juge de Paix
                </CardTitle>
                <CardDescription className="text-sm">
                  Document complet avec table des matières, preuves indexées et bases légales
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-2">
                  <p className="font-medium">Ce dossier contient:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Résumé exécutif</li>
                    <li>Liste des incidents transmis au JP</li>
                    <li>Chronologie des faits</li>
                    <li>Bases légales applicables (CC, Cst., PA, LPD, LVPAE)</li>
                    <li>Preuves documentaires indexées</li>
                    <li>Recommandations</li>
                  </ul>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">{incidents.filter(i => i.transmisJP).length} transmis JP</Badge>
                  <Badge variant="destructive">{incidents.filter(i => i.gravite === 'Critique').length} critiques</Badge>
                </div>
                <Button onClick={exportDossierProbatoire} disabled={loading === 'probatoire'} className="w-full">
                  {loading === 'probatoire' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Générer Dossier Probatoire
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
