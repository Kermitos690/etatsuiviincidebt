import jsPDF from 'jspdf';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Incident {
  id: string;
  numero: number;
  titre: string;
  faits: string;
  dysfonctionnement: string;
  institution: string;
  type: string;
  gravite: string;
  statut: string;
  priorite: string;
  date_incident: string;
  created_at: string;
  score: number;
  preuves?: any;
  gmail_references?: any;
  confidence_level?: string;
}

interface ThreadAnalysis {
  id: string;
  thread_id: string;
  chronological_summary?: string;
  detected_issues?: any;
  citations?: any;
  severity?: string;
  participants?: any;
  emails_count?: number;
}

interface EmailFact {
  id: string;
  email_id: string;
  sender_name?: string;
  sender_email?: string;
  mentioned_institutions?: string[];
  key_phrases?: string[];
  action_items?: string[];
  raw_citations?: any;
}

interface WeeklyReportData {
  dateRange: { start: Date; end: Date };
  incidents: Incident[];
  threadAnalyses: ThreadAnalysis[];
  emailFacts: EmailFact[];
  stats: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    byInstitution: { name: string; value: number }[];
    byStatus: { name: string; value: number }[];
    byType: { name: string; value: number }[];
  };
}

const COLORS = {
  primary: [59, 130, 246] as [number, number, number],
  destructive: [239, 68, 68] as [number, number, number],
  warning: [245, 158, 11] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  dark: [30, 41, 59] as [number, number, number],
};

const SEVERITY_COLORS: Record<string, [number, number, number]> = {
  'Critique': [220, 38, 38],
  'Haute': [234, 88, 12],
  'Moyenne': [202, 138, 4],
  'Faible': [22, 163, 74],
};

export async function generateWeeklyPDF(data: WeeklyReportData): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addNewPageIfNeeded = (requiredHeight: number) => {
    if (y + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
      addHeader();
      return true;
    }
    return false;
  };

  const addHeader = () => {
    pdf.setFillColor(30, 41, 59);
    pdf.rect(0, 0, pageWidth, 12, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.text('RAPPORT HEBDOMADAIRE - REGISTRE DES INCIDENTS', margin, 8);
    pdf.text(format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr }), pageWidth - margin - 30, 8);
    y = 20;
  };

  const addFooter = (pageNum: number, totalPages: number) => {
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, pageHeight - 10, pageWidth, 10, 'F');
    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(7);
    pdf.text(`Page ${pageNum} / ${totalPages}`, pageWidth / 2, pageHeight - 4, { align: 'center' });
    pdf.text('Document confidentiel - Curatelle volontaire de gestion', margin, pageHeight - 4);
  };

  const drawSectionTitle = (title: string, icon?: string) => {
    addNewPageIfNeeded(15);
    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(margin, y, contentWidth, 8, 1, 1, 'F');
    pdf.setTextColor(...COLORS.dark);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title.toUpperCase(), margin + 3, y + 5.5);
    y += 12;
    pdf.setFont('helvetica', 'normal');
  };

  const drawKPIBox = (x: number, width: number, value: string, label: string, color: [number, number, number]) => {
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(...color);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(x, y, width, 18, 2, 2, 'FD');
    
    pdf.setTextColor(...color);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(value, x + width / 2, y + 8, { align: 'center' });
    
    pdf.setTextColor(...COLORS.muted);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text(label, x + width / 2, y + 14, { align: 'center' });
  };

  const drawProgressBar = (x: number, width: number, percent: number, color: [number, number, number]) => {
    pdf.setFillColor(226, 232, 240);
    pdf.roundedRect(x, y, width, 3, 1, 1, 'F');
    pdf.setFillColor(...color);
    pdf.roundedRect(x, y, width * (percent / 100), 3, 1, 1, 'F');
  };

  // ===== PAGE DE COUVERTURE =====
  pdf.setFillColor(30, 41, 59);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Logo/Titre
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RAPPORT HEBDOMADAIRE', pageWidth / 2, 60, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Registre des Incidents - Curatelle', pageWidth / 2, 72, { align: 'center' });
  
  // Période
  pdf.setFillColor(59, 130, 246);
  pdf.roundedRect(margin + 20, 90, contentWidth - 40, 20, 3, 3, 'F');
  pdf.setFontSize(12);
  pdf.text('PÉRIODE ANALYSÉE', pageWidth / 2, 98, { align: 'center' });
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(
    `${format(data.dateRange.start, 'dd MMMM yyyy', { locale: fr })} - ${format(data.dateRange.end, 'dd MMMM yyyy', { locale: fr })}`,
    pageWidth / 2, 106, { align: 'center' }
  );

  // Stats résumé
  y = 130;
  pdf.setFont('helvetica', 'normal');
  const statItems = [
    { label: 'Incidents analysés', value: data.stats.total.toString() },
    { label: 'Incidents critiques', value: data.stats.critical.toString() },
    { label: 'Institutions concernées', value: data.stats.byInstitution.length.toString() },
    { label: 'Threads analysés', value: data.threadAnalyses.length.toString() },
  ];

  statItems.forEach((item, i) => {
    pdf.setTextColor(148, 163, 184);
    pdf.setFontSize(10);
    pdf.text(item.label, margin + 30, y + i * 12);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(item.value, pageWidth - margin - 30, y + i * 12, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
  });

  // Date de génération
  pdf.setTextColor(100, 116, 139);
  pdf.setFontSize(9);
  pdf.text(`Généré le ${format(new Date(), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}`, pageWidth / 2, pageHeight - 20, { align: 'center' });

  // ===== PAGE 2: SYNTHÈSE EXÉCUTIVE =====
  pdf.addPage();
  addHeader();

  drawSectionTitle('1. Synthèse Exécutive');
  
  // KPIs
  const kpiWidth = (contentWidth - 9) / 4;
  drawKPIBox(margin, kpiWidth, data.stats.total.toString(), 'Total Incidents', COLORS.primary);
  drawKPIBox(margin + kpiWidth + 3, kpiWidth, data.stats.critical.toString(), 'Critiques', COLORS.destructive);
  drawKPIBox(margin + (kpiWidth + 3) * 2, kpiWidth, data.stats.high.toString(), 'Haute Priorité', COLORS.warning);
  drawKPIBox(margin + (kpiWidth + 3) * 3, kpiWidth, data.stats.byInstitution.length.toString(), 'Institutions', COLORS.primary);
  y += 22;

  // Répartition par gravité
  drawSectionTitle('2. Répartition par Gravité');
  
  const severities = [
    { name: 'Critique', count: data.stats.critical, color: SEVERITY_COLORS['Critique'] },
    { name: 'Haute', count: data.stats.high, color: SEVERITY_COLORS['Haute'] },
    { name: 'Moyenne', count: data.stats.medium, color: SEVERITY_COLORS['Moyenne'] },
    { name: 'Faible', count: data.stats.low, color: SEVERITY_COLORS['Faible'] },
  ];

  severities.forEach((sev) => {
    addNewPageIfNeeded(10);
    const percent = data.stats.total > 0 ? (sev.count / data.stats.total) * 100 : 0;
    
    pdf.setTextColor(...COLORS.dark);
    pdf.setFontSize(9);
    pdf.text(sev.name, margin, y + 2);
    pdf.text(`${sev.count} (${percent.toFixed(0)}%)`, margin + 40, y + 2);
    
    drawProgressBar(margin + 60, contentWidth - 60, percent, sev.color);
    y += 8;
  });
  y += 5;

  // ===== RÉPARTITION PAR INSTITUTION =====
  drawSectionTitle('3. Analyse par Institution');

  data.stats.byInstitution.slice(0, 10).forEach((inst, index) => {
    addNewPageIfNeeded(12);
    const percent = data.stats.total > 0 ? (inst.value / data.stats.total) * 100 : 0;
    
    // Numéro
    pdf.setFillColor(...COLORS.primary);
    pdf.circle(margin + 3, y + 2, 3, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7);
    pdf.text((index + 1).toString(), margin + 3, y + 3, { align: 'center' });
    
    // Nom institution
    pdf.setTextColor(...COLORS.dark);
    pdf.setFontSize(9);
    const instName = inst.name.length > 35 ? inst.name.substring(0, 35) + '...' : inst.name;
    pdf.text(instName, margin + 10, y + 3);
    
    // Barre + valeur
    const barX = margin + 80;
    const barWidth = contentWidth - 95;
    drawProgressBar(barX, barWidth, percent, COLORS.primary);
    
    pdf.setTextColor(...COLORS.muted);
    pdf.text(`${inst.value}`, pageWidth - margin - 5, y + 3, { align: 'right' });
    y += 10;
  });
  y += 5;

  // ===== LISTE DES INCIDENTS =====
  drawSectionTitle('4. Détail des Incidents');

  // Tri par gravité puis date
  const sortedIncidents = [...data.incidents].sort((a, b) => {
    const gravOrder = { 'Critique': 0, 'Haute': 1, 'Moyenne': 2, 'Faible': 3 };
    const aOrder = gravOrder[a.gravite as keyof typeof gravOrder] ?? 4;
    const bOrder = gravOrder[b.gravite as keyof typeof gravOrder] ?? 4;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  sortedIncidents.forEach((inc, index) => {
    addNewPageIfNeeded(35);

    // En-tête incident
    const sevColor = SEVERITY_COLORS[inc.gravite] || COLORS.muted;
    pdf.setFillColor(...sevColor);
    pdf.roundedRect(margin, y, contentWidth, 6, 1, 1, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`#${inc.numero} - ${inc.gravite.toUpperCase()}`, margin + 2, y + 4);
    pdf.text(format(parseISO(inc.created_at), 'dd/MM/yyyy', { locale: fr }), pageWidth - margin - 2, y + 4, { align: 'right' });
    y += 8;

    // Titre
    pdf.setTextColor(...COLORS.dark);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    const titleLines = pdf.splitTextToSize(inc.titre, contentWidth - 4);
    pdf.text(titleLines, margin + 2, y + 3);
    y += titleLines.length * 4 + 2;
    pdf.setFont('helvetica', 'normal');

    // Métadonnées
    pdf.setFontSize(8);
    pdf.setTextColor(...COLORS.muted);
    pdf.text(`Institution: ${inc.institution}`, margin + 2, y + 2);
    pdf.text(`Type: ${inc.type}`, margin + 80, y + 2);
    pdf.text(`Statut: ${inc.statut}`, pageWidth - margin - 30, y + 2);
    y += 5;

    // Faits
    if (inc.faits) {
      pdf.setTextColor(...COLORS.dark);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'italic');
      const faitsText = inc.faits.length > 300 ? inc.faits.substring(0, 300) + '...' : inc.faits;
      const faitsLines = pdf.splitTextToSize(`« ${faitsText} »`, contentWidth - 8);
      
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin + 2, y, contentWidth - 4, faitsLines.length * 3 + 4, 1, 1, 'F');
      pdf.text(faitsLines, margin + 4, y + 4);
      y += faitsLines.length * 3 + 6;
      pdf.setFont('helvetica', 'normal');
    }

    // Dysfonctionnement
    if (inc.dysfonctionnement) {
      pdf.setTextColor(...COLORS.destructive);
      pdf.setFontSize(7);
      const dysfLines = pdf.splitTextToSize(`Dysfonctionnement: ${inc.dysfonctionnement}`, contentWidth - 4);
      pdf.text(dysfLines.slice(0, 2), margin + 2, y + 2);
      y += Math.min(dysfLines.length, 2) * 3 + 2;
    }

    y += 5;
  });

  // ===== ANNEXE: ANALYSES DE THREADS =====
  if (data.threadAnalyses.length > 0) {
    pdf.addPage();
    addHeader();
    drawSectionTitle('ANNEXE A - Analyses de Conversations');

    data.threadAnalyses.forEach((thread, index) => {
      addNewPageIfNeeded(25);

      pdf.setFillColor(241, 245, 249);
      pdf.roundedRect(margin, y, contentWidth, 6, 1, 1, 'F');
      pdf.setTextColor(...COLORS.dark);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Thread #${index + 1} - ${thread.emails_count || 0} emails`, margin + 2, y + 4);
      if (thread.severity) {
        pdf.text(`Sévérité: ${thread.severity}`, pageWidth - margin - 2, y + 4, { align: 'right' });
      }
      y += 8;
      pdf.setFont('helvetica', 'normal');

      // Résumé
      if (thread.chronological_summary) {
        pdf.setFontSize(7);
        pdf.setTextColor(...COLORS.dark);
        const summaryLines = pdf.splitTextToSize(thread.chronological_summary, contentWidth - 4);
        pdf.text(summaryLines.slice(0, 4), margin + 2, y + 2);
        y += Math.min(summaryLines.length, 4) * 3 + 2;
      }

      // Citations
      if (thread.citations && Array.isArray(thread.citations) && thread.citations.length > 0) {
        pdf.setTextColor(...COLORS.muted);
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'italic');
        thread.citations.slice(0, 3).forEach((citation: any) => {
          if (typeof citation === 'string' || citation?.text) {
            const citText = typeof citation === 'string' ? citation : citation.text;
            const citLines = pdf.splitTextToSize(`« ${citText.substring(0, 150)}${citText.length > 150 ? '...' : ''} »`, contentWidth - 8);
            addNewPageIfNeeded(citLines.length * 2.5 + 2);
            pdf.text(citLines.slice(0, 2), margin + 4, y + 2);
            y += Math.min(citLines.length, 2) * 2.5 + 2;
          }
        });
        pdf.setFont('helvetica', 'normal');
      }

      y += 5;
    });
  }

  // ===== ANNEXE: PREUVES ET FAITS EXTRAITS =====
  if (data.emailFacts.length > 0) {
    pdf.addPage();
    addHeader();
    drawSectionTitle('ANNEXE B - Faits Extraits des Emails');

    data.emailFacts.slice(0, 50).forEach((fact, index) => {
      addNewPageIfNeeded(18);

      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(margin, y, contentWidth, 14, 1, 1, 'FD');

      pdf.setTextColor(...COLORS.dark);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Email #${index + 1}`, margin + 2, y + 4);
      pdf.setFont('helvetica', 'normal');

      if (fact.sender_name || fact.sender_email) {
        pdf.setTextColor(...COLORS.muted);
        pdf.text(`De: ${fact.sender_name || ''} <${fact.sender_email || ''}>`, margin + 25, y + 4);
      }

      // Institutions mentionnées
      if (fact.mentioned_institutions && fact.mentioned_institutions.length > 0) {
        pdf.setTextColor(...COLORS.primary);
        pdf.text(`Institutions: ${fact.mentioned_institutions.join(', ')}`, margin + 2, y + 8);
      }

      // Phrases clés
      if (fact.key_phrases && fact.key_phrases.length > 0) {
        pdf.setTextColor(...COLORS.dark);
        pdf.setFontSize(6);
        const phrases = fact.key_phrases.slice(0, 3).join(' | ');
        pdf.text(phrases.substring(0, 100), margin + 2, y + 12);
      }

      y += 16;
    });
  }

  // ===== ANNEXE: CITATIONS ET PREUVES =====
  pdf.addPage();
  addHeader();
  drawSectionTitle('ANNEXE C - Index des Preuves');

  let proofIndex = 1;
  sortedIncidents.forEach((inc) => {
    if (inc.preuves && Array.isArray(inc.preuves) && inc.preuves.length > 0) {
      addNewPageIfNeeded(15);
      
      pdf.setTextColor(...COLORS.dark);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Incident #${inc.numero}: ${inc.titre.substring(0, 50)}${inc.titre.length > 50 ? '...' : ''}`, margin, y + 2);
      y += 5;
      pdf.setFont('helvetica', 'normal');

      inc.preuves.forEach((preuve: any) => {
        addNewPageIfNeeded(8);
        pdf.setFontSize(7);
        pdf.setTextColor(...COLORS.muted);
        const preuveText = typeof preuve === 'string' ? preuve : JSON.stringify(preuve);
        pdf.text(`[P${proofIndex}] ${preuveText.substring(0, 80)}${preuveText.length > 80 ? '...' : ''}`, margin + 4, y + 2);
        proofIndex++;
        y += 4;
      });
      y += 3;
    }

    // Gmail references
    if (inc.gmail_references && Array.isArray(inc.gmail_references) && inc.gmail_references.length > 0) {
      addNewPageIfNeeded(8);
      pdf.setFontSize(6);
      pdf.setTextColor(...COLORS.muted);
      pdf.text(`Refs Gmail: ${inc.gmail_references.length} thread(s) liés`, margin + 4, y + 2);
      y += 4;
    }
  });

  // ===== PAGE FINALE: AVERTISSEMENTS =====
  pdf.addPage();
  addHeader();
  drawSectionTitle('Notes et Avertissements');

  const disclaimers = [
    'Ce rapport est généré automatiquement à partir des données du système de suivi des incidents.',
    'Les analyses IA ont une marge d\'erreur et doivent être vérifiées manuellement.',
    'Les citations sont extraites automatiquement et peuvent être incomplètes.',
    'Ce document est confidentiel et destiné uniquement aux personnes autorisées.',
    'La curatelle volontaire de gestion et représentation est régie par les articles 394-395 CC.',
    'Toute utilisation à des fins autres que le suivi de la curatelle est interdite.',
  ];

  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.dark);
  disclaimers.forEach((disc, i) => {
    const lines = pdf.splitTextToSize(`${i + 1}. ${disc}`, contentWidth - 10);
    pdf.text(lines, margin + 5, y + 2);
    y += lines.length * 4 + 2;
  });

  y += 10;
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, y, contentWidth, 20, 2, 2, 'F');
  pdf.setTextColor(...COLORS.muted);
  pdf.setFontSize(9);
  pdf.text('Base légale:', margin + 5, y + 6);
  pdf.setFontSize(7);
  pdf.text('Code civil suisse: Art. 388, 389, 390, 392, 393, 394, 395, 406, 413, 416, 419', margin + 5, y + 11);
  pdf.text('Constitution fédérale: Art. 7, 8, 9, 10, 13, 29', margin + 5, y + 15);

  // Ajouter footers
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(i, totalPages);
  }

  // Télécharger
  const filename = `rapport-hebdomadaire-${format(data.dateRange.start, 'yyyy-MM-dd')}-${format(data.dateRange.end, 'yyyy-MM-dd')}.pdf`;
  pdf.save(filename);
}
