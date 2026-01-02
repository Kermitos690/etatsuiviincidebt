import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  PDF_COLORS, 
  PDF_DIMENSIONS, 
  setColor, 
  drawPremiumHeader, 
  drawPremiumFooter,
  drawSectionTitle,
  normalizeTextForPdf,
  drawJustifiedText,
} from './pdfStyles';

export interface EmailFact {
  id: string;
  email_id: string;
  sender_name: string | null;
  sender_email: string | null;
  recipients: string[] | null;
  mentioned_persons: string[] | null;
  mentioned_institutions: string[] | null;
  mentioned_dates: string[] | null;
  key_phrases: string[] | null;
  action_items: string[] | null;
  sentiment: string | null;
  urgency_level: string | null;
  raw_citations: { text: string; context: string }[] | null;
  extracted_at: string;
  email?: {
    subject: string;
    body: string;
    received_at: string;
    sender: string;
  };
}

export interface Dysfunction {
  id: string;
  type: string;
  description: string;
  date: string;
  proof: string;
  emailId: string;
  severity: 'high' | 'medium' | 'low';
}

export interface Actor {
  name: string;
  email?: string;
  institution?: string;
  emailCount: number;
  dysfunctionCount: number;
  lastContact: string;
}

export interface Stats {
  totalEmails: number;
  totalFacts: number;
  totalDysfunctions: number;
  avgResponseDays: number;
  dateRange: { start: string; end: string };
}

interface FactualPDFData {
  facts: EmailFact[];
  dysfunctions: Dysfunction[];
  actors: Actor[];
  stats: Stats;
}

export async function generateFactualPDF(data: FactualPDFData): Promise<void> {
  const { facts, dysfunctions, actors, stats } = data;
  const doc = new jsPDF();
  const { marginLeft, marginRight, pageWidth, pageHeight, contentWidth } = PDF_DIMENSIONS;

  let currentPage = 1;
  let totalPages = 1; // Will be updated

  const checkPageBreak = (neededSpace: number, currentY: number): number => {
    const { maxContentY, marginTop } = PDF_DIMENSIONS;
    if (currentY + neededSpace > maxContentY) {
      doc.addPage();
      currentPage++;
      totalPages = Math.max(totalPages, currentPage);
      return marginTop + 10;
    }
    return currentY;
  };

  // ===== PAGE 1: Cover =====
  let y = drawPremiumHeader(doc, 'juridique', 'Dossier Factuel - Juge de Paix');

  // Metadata box
  y += 10;
  setColor(doc, PDF_COLORS.background, 'fill');
  doc.roundedRect(marginLeft, y, contentWidth, 40, 3, 3, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setColor(doc, PDF_COLORS.text);

  const metadata = [
    ['Date de generation:', format(new Date(), 'dd MMMM yyyy', { locale: fr })],
    ['Periode couverte:', `${stats.dateRange.start} au ${stats.dateRange.end}`],
    ['Emails analyses:', stats.totalEmails.toString()],
    ['Dysfonctionnements:', stats.totalDysfunctions.toString()],
  ];

  let metaY = y + 10;
  for (const [label, value] of metadata) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, marginLeft + 5, metaY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, marginLeft + 60, metaY);
    metaY += 8;
  }

  y += 55;

  // Important notice
  setColor(doc, PDF_COLORS.critique, 'draw');
  doc.setLineWidth(1);
  doc.line(marginLeft, y, marginLeft + 3, y);
  
  doc.setFontSize(9);
  setColor(doc, PDF_COLORS.critique);
  doc.setFont('helvetica', 'bold');
  doc.text('IMPORTANT', marginLeft + 6, y + 1);
  
  doc.setFont('helvetica', 'normal');
  setColor(doc, PDF_COLORS.text);
  const notice = 'Ce document presente uniquement des FAITS extraits des emails. Aucune interpretation juridique. Toutes les informations sont verifiables par les pieces jointes.';
  const noticeLines = doc.splitTextToSize(notice, contentWidth - 10);
  doc.text(noticeLines, marginLeft + 6, y + 8);

  // ===== SECTION 1: DYSFONCTIONNEMENTS =====
  y += 35;
  y = drawSectionTitle(doc, 'DYSFONCTIONNEMENTS CONSTATES', y, { numbered: true, number: 1 });

  // Group by severity
  const highSeverity = dysfunctions.filter(d => d.severity === 'high');
  const mediumSeverity = dysfunctions.filter(d => d.severity === 'medium');
  const lowSeverity = dysfunctions.filter(d => d.severity === 'low');

  // Critical issues
  if (highSeverity.length > 0) {
    y = checkPageBreak(20, y);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.critique);
    doc.text(`Critiques (${highSeverity.length})`, marginLeft, y);
    y += 6;

    for (const d of highSeverity.slice(0, 10)) {
      y = checkPageBreak(15, y);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      setColor(doc, PDF_COLORS.text);
      
      const dateStr = d.date ? format(new Date(d.date), 'dd/MM/yyyy') : 'N/A';
      doc.text(`[${dateStr}]`, marginLeft, y);
      
      const desc = normalizeTextForPdf(d.description, { maxLength: 100 });
      const descLines = doc.splitTextToSize(desc, contentWidth - 30);
      doc.text(descLines, marginLeft + 25, y);
      
      y += descLines.length * 4 + 4;
    }
  }

  // Medium issues
  if (mediumSeverity.length > 0) {
    y = checkPageBreak(20, y);
    y += 5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.haute);
    doc.text(`Moderes (${mediumSeverity.length})`, marginLeft, y);
    y += 6;

    for (const d of mediumSeverity.slice(0, 8)) {
      y = checkPageBreak(15, y);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      setColor(doc, PDF_COLORS.text);
      
      const dateStr = d.date ? format(new Date(d.date), 'dd/MM/yyyy') : 'N/A';
      doc.text(`[${dateStr}]`, marginLeft, y);
      
      const desc = normalizeTextForPdf(d.description, { maxLength: 100 });
      const descLines = doc.splitTextToSize(desc, contentWidth - 30);
      doc.text(descLines, marginLeft + 25, y);
      
      y += descLines.length * 4 + 4;
    }
  }

  // ===== SECTION 2: CHRONOLOGIE =====
  doc.addPage();
  currentPage++;
  y = 25;
  y = drawSectionTitle(doc, 'CHRONOLOGIE DES FAITS', y, { numbered: true, number: 2 });

  // Sort facts by date
  const sortedFacts = [...facts]
    .filter(f => f.email?.received_at)
    .sort((a, b) => new Date(b.email!.received_at).getTime() - new Date(a.email!.received_at).getTime())
    .slice(0, 30);

  for (const fact of sortedFacts) {
    y = checkPageBreak(25, y);

    const dateStr = format(new Date(fact.email!.received_at), 'dd/MM/yyyy HH:mm');
    const sender = fact.sender_name || fact.sender_email || 'Inconnu';
    
    // Date and sender
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.primary);
    doc.text(`[${dateStr}]`, marginLeft, y);
    
    setColor(doc, PDF_COLORS.text);
    doc.text(normalizeTextForPdf(sender, { maxLength: 40 }), marginLeft + 35, y);
    y += 5;
    
    // Subject
    if (fact.email?.subject) {
      doc.setFont('helvetica', 'normal');
      setColor(doc, PDF_COLORS.secondary);
      const subject = normalizeTextForPdf(fact.email.subject, { maxLength: 80 });
      doc.text(`Objet: ${subject}`, marginLeft + 5, y);
      y += 5;
    }

    // Key citation if available
    if (fact.raw_citations && fact.raw_citations.length > 0) {
      doc.setFont('helvetica', 'italic');
      setColor(doc, PDF_COLORS.muted);
      const citation = normalizeTextForPdf(fact.raw_citations[0].text, { maxLength: 120 });
      const citationLines = doc.splitTextToSize(`"${citation}"`, contentWidth - 10);
      doc.text(citationLines, marginLeft + 5, y);
      y += citationLines.length * 4;
    }

    y += 4;
  }

  // ===== SECTION 3: ACTEURS =====
  doc.addPage();
  currentPage++;
  y = 25;
  y = drawSectionTitle(doc, 'ACTEURS IMPLIQUES', y, { numbered: true, number: 3 });

  // Sort by dysfunction count
  const sortedActors = [...actors]
    .sort((a, b) => b.dysfunctionCount - a.dysfunctionCount)
    .slice(0, 15);

  // Table header
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setColor(doc, PDF_COLORS.primary);
  doc.text('Nom', marginLeft, y);
  doc.text('Institution', marginLeft + 50, y);
  doc.text('Emails', marginLeft + 110, y);
  doc.text('Dysf.', marginLeft + 135, y);
  doc.text('Dernier contact', marginLeft + 150, y);
  
  y += 2;
  setColor(doc, PDF_COLORS.border, 'draw');
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 5;

  for (const actor of sortedActors) {
    y = checkPageBreak(10, y);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    // Highlight if has dysfunctions
    if (actor.dysfunctionCount > 0) {
      setColor(doc, PDF_COLORS.critique);
    } else {
      setColor(doc, PDF_COLORS.text);
    }
    
    doc.text(normalizeTextForPdf(actor.name, { maxLength: 25 }), marginLeft, y);
    doc.text(actor.institution || '-', marginLeft + 50, y);
    doc.text(actor.emailCount.toString(), marginLeft + 115, y);
    doc.text(actor.dysfunctionCount.toString(), marginLeft + 140, y);
    doc.text(format(new Date(actor.lastContact), 'dd/MM/yy'), marginLeft + 150, y);
    
    y += 6;
  }

  // ===== SECTION 4: STATISTIQUES =====
  y += 10;
  y = checkPageBreak(50, y);
  y = drawSectionTitle(doc, 'STATISTIQUES', y, { numbered: true, number: 4 });

  const statsData = [
    ['Total emails analyses', stats.totalEmails.toString()],
    ['Total faits extraits', stats.totalFacts.toString()],
    ['Total dysfonctionnements', stats.totalDysfunctions.toString()],
    ['Dont critiques', highSeverity.length.toString()],
    ['Dont moderes', mediumSeverity.length.toString()],
    ['Acteurs identifies', actors.length.toString()],
  ];

  for (const [label, value] of statsData) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    setColor(doc, PDF_COLORS.text);
    doc.text(label, marginLeft, y);
    doc.setFont('helvetica', 'bold');
    doc.text(value, marginLeft + 80, y);
    y += 7;
  }

  // Add footers to all pages
  totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPremiumFooter(doc, 'juridique', i, totalPages, format(new Date(), 'dd/MM/yyyy'));
  }

  // Save
  const filename = `dossier-factuel-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
}
