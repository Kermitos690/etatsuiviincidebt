/**
 * Generate Juridique PDF - Style Formel Justice de Paix
 * Export ultra premium pour dossiers juridiques officiels
 */

import jsPDF from 'jspdf';
import {
  PDF_COLORS,
  PDF_DIMENSIONS,
  setColor,
  getSeverityColor,
  drawPremiumHeader,
  drawSectionTitle,
  drawLegalBox,
  drawCitation,
  addFootersToAllPages,
  checkPageBreak,
  formatPDFDate,
  formatPDFDateTime,
  normalizeTextForPdf,
  drawJustifiedText,
} from './pdfStyles';
import {
  extractLegalReferences,
  fetchLegalExplanations,
  getDefaultLegalBasesForType,
  LegalExplanation,
} from './pdfLegalExplainer';

interface IncidentData {
  id: string;
  numero: number;
  titre: string;
  dateIncident: string;
  dateCreation: string;
  institution: string;
  type: string;
  gravite: string;
  priorite: string;
  score: number;
  statut: string;
  faits: string;
  dysfonctionnement: string;
  transmisJP: boolean;
  dateTransmissionJP?: string | null;
  preuves: Array<{
    id: string;
    type: string;
    label: string;
    url?: string;
  }>;
}

interface ThreadAnalysis {
  id: string;
  thread_id: string;
  chronological_summary?: string;
  detected_issues?: any;
  citations?: any;
  participants?: any;
  severity?: string;
}

interface EmailFact {
  id: string;
  sender_name?: string;
  sender_email?: string;
  sentiment?: string;
  urgency_level?: string;
  key_phrases?: string[];
  action_items?: string[];
  raw_citations?: any;
}

interface GenerateJuridiquePDFOptions {
  incidents: IncidentData[];
  threadAnalyses?: ThreadAnalysis[];
  emailFacts?: EmailFact[];
  reportTitle?: string;
  destinataire?: string;
  period?: { start: string; end: string };
}

/**
 * Génère un dossier juridique formel pour la Justice de Paix
 */
export async function generateJuridiquePDF(options: GenerateJuridiquePDFOptions): Promise<void> {
  const {
    incidents,
    threadAnalyses = [],
    emailFacts = [],
    reportTitle = 'DOSSIER JURIDIQUE',
    destinataire = 'Justice de Paix',
    period,
  } = options;

  const doc = new jsPDF();
  const { marginLeft, contentWidth, pageWidth, marginRight } = PDF_DIMENSIONS;

  // ============================================
  // PAGE DE GARDE
  // ============================================
  
  // Bande supérieure
  setColor(doc, PDF_COLORS.primary, 'fill');
  doc.rect(0, 0, pageWidth, 25, 'F');

  // Titre principal
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  setColor(doc, PDF_COLORS.primary);
  doc.text(reportTitle, pageWidth / 2, 60, { align: 'center' });

  // Sous-titre
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  setColor(doc, PDF_COLORS.secondary);
  doc.text('Protection de l\'Adulte - Canton de Vaud', pageWidth / 2, 72, { align: 'center' });

  // Ligne décorative
  setColor(doc, PDF_COLORS.legal, 'draw');
  doc.setLineWidth(1);
  doc.line(60, 85, pageWidth - 60, 85);

  // Destinataire
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  setColor(doc, PDF_COLORS.text);
  doc.text(`À l'attention de: ${destinataire}`, marginLeft, 110);

  // Période couverte
  if (period) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Période: du ${formatPDFDate(period.start)} au ${formatPDFDate(period.end)}`, marginLeft, 120);
  }

  // Statistiques résumées
  const critiques = incidents.filter(i => i.gravite === 'Critique').length;
  const hautes = incidents.filter(i => i.gravite === 'Haute' || i.gravite === 'Grave').length;
  const transmis = incidents.filter(i => i.transmisJP).length;

  doc.setFontSize(11);
  let statsY = 140;
  
  setColor(doc, PDF_COLORS.background, 'fill');
  doc.roundedRect(marginLeft, statsY - 5, contentWidth, 45, 3, 3, 'F');
  
  statsY += 5;
  doc.setFont('helvetica', 'bold');
  setColor(doc, PDF_COLORS.primary);
  doc.text('SYNTHÈSE DU DOSSIER', marginLeft + 5, statsY);
  
  statsY += 10;
  doc.setFont('helvetica', 'normal');
  setColor(doc, PDF_COLORS.text);
  doc.text(`• Nombre total d'incidents documentés: ${incidents.length}`, marginLeft + 10, statsY);
  statsY += 7;
  doc.text(`• Incidents de gravité critique: ${critiques}`, marginLeft + 10, statsY);
  statsY += 7;
  doc.text(`• Incidents de haute gravité: ${hautes}`, marginLeft + 10, statsY);
  statsY += 7;
  doc.text(`• Incidents déjà transmis à la Justice de Paix: ${transmis}`, marginLeft + 10, statsY);

  // Date et signature
  doc.setFontSize(10);
  setColor(doc, PDF_COLORS.muted);
  doc.text(`Document généré le ${formatPDFDateTime(new Date().toISOString())}`, marginLeft, 250);
  doc.text('Système d\'Audit Juridique - Protection de l\'Adulte', marginLeft, 258);

  // Mention de confidentialité
  setColor(doc, PDF_COLORS.critique);
  doc.setFont('helvetica', 'bold');
  doc.text('CONFIDENTIEL - Art. 13 LPD', pageWidth / 2, 275, { align: 'center' });

  // ============================================
  // TABLE DES MATIÈRES
  // ============================================
  
  doc.addPage();
  let y = drawPremiumHeader(doc, 'juridique', 'Table des matières');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  setColor(doc, PDF_COLORS.text);

  const sections = [
    { num: 'I', title: 'Objet du rapport', page: 3 },
    { num: 'II', title: 'Faits établis', page: 3 },
    { num: 'III', title: 'Qualification juridique', page: 4 + Math.ceil(incidents.length / 3) },
    { num: 'IV', title: 'Preuves documentées', page: 5 + Math.ceil(incidents.length / 2) },
    { num: 'V', title: 'Conclusions', page: 6 + incidents.length },
    { num: 'A', title: 'Annexe - Citations sources', page: 7 + incidents.length },
    { num: 'B', title: 'Annexe - Référentiel légal', page: 8 + incidents.length },
  ];

  for (const section of sections) {
    doc.text(`${section.num}.`, marginLeft, y);
    doc.text(section.title, marginLeft + 15, y);
    
    // Pointillés
    const textWidth = doc.getTextWidth(section.title);
    const dotsStart = marginLeft + 15 + textWidth + 5;
    const dotsEnd = pageWidth - marginRight - 20;
    doc.setLineDashPattern([1, 2], 0);
    setColor(doc, PDF_COLORS.light, 'draw');
    doc.line(dotsStart, y, dotsEnd, y);
    doc.setLineDashPattern([], 0);
    
    setColor(doc, PDF_COLORS.text);
    doc.text(String(section.page), pageWidth - marginRight, y, { align: 'right' });
    y += 10;
  }

  // ============================================
  // I. OBJET DU RAPPORT
  // ============================================
  
  doc.addPage();
  y = drawPremiumHeader(doc, 'juridique');
  y = drawSectionTitle(doc, 'OBJET DU RAPPORT', y, { numbered: false, color: PDF_COLORS.primary, fontSize: 16 });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  setColor(doc, PDF_COLORS.text);

  const objetText = `Le présent rapport a pour objet de porter à la connaissance de la ${destinataire} ` +
    `les dysfonctionnements constatés dans le cadre des mesures de protection de l'adulte, ` +
    `conformément aux articles 388-456 du Code civil suisse et à la législation cantonale applicable (LVPAE).`;

  const objetLines = doc.splitTextToSize(objetText, contentWidth);
  doc.text(objetLines, marginLeft, y);
  y += objetLines.length * 5 + 10;

  const periodText = period 
    ? `Ce rapport couvre la période du ${formatPDFDate(period.start)} au ${formatPDFDate(period.end)}.`
    : `Ce rapport présente l'ensemble des incidents documentés à ce jour.`;
  
  doc.text(periodText, marginLeft, y);
  y += 15;

  // ============================================
  // II. FAITS ÉTABLIS
  // ============================================
  
  y = drawSectionTitle(doc, 'FAITS ÉTABLIS', y, { numbered: false, color: PDF_COLORS.primary, fontSize: 16 });

  // Tri par date et gravité
  const sortedIncidents = [...incidents].sort((a, b) => {
    const graviteOrder = { 'Critique': 0, 'Haute': 1, 'Grave': 1, 'Moyenne': 2, 'Modéré': 2, 'Faible': 3, 'Mineur': 3 };
    const aOrder = graviteOrder[a.gravite as keyof typeof graviteOrder] ?? 4;
    const bOrder = graviteOrder[b.gravite as keyof typeof graviteOrder] ?? 4;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(b.dateIncident).getTime() - new Date(a.dateIncident).getTime();
  });

  for (let i = 0; i < sortedIncidents.length; i++) {
    const incident = sortedIncidents[i];
    y = checkPageBreak(doc, y, 50);

    // Numéro de fait
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const severityColor = getSeverityColor(incident.gravite);
    setColor(doc, severityColor);
    doc.text(`Fait n°${i + 1}`, marginLeft, y);
    
    // Badge gravité
    setColor(doc, severityColor, 'fill');
    doc.roundedRect(marginLeft + 25, y - 4, 25, 6, 1, 1, 'F');
    doc.setFontSize(7);
    setColor(doc, PDF_COLORS.white);
    doc.text(incident.gravite.toUpperCase(), marginLeft + 37.5, y - 0.5, { align: 'center' });

    y += 8;

    // Date et institution
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    setColor(doc, PDF_COLORS.muted);
    doc.text(`Date: ${formatPDFDate(incident.dateIncident)} | Institution: ${incident.institution} | Réf: INC-${incident.numero}`, marginLeft + 5, y);
    y += 6;

    // Faits - texte justifié avec largeur sûre
    doc.setFontSize(10);
    setColor(doc, PDF_COLORS.text);
    const faitsText = normalizeTextForPdf(incident.faits || 'Faits non renseignés.', { maxLength: 1500 });
    const safeWidth = PDF_DIMENSIONS.safeContentWidth - PDF_DIMENSIONS.textInnerMargin;
    y = drawJustifiedText(doc, faitsText, marginLeft + 5, y, safeWidth, 4.5);
    y += 8;
  }

  // ============================================
  // III. QUALIFICATION JURIDIQUE
  // ============================================
  
  doc.addPage();
  y = drawPremiumHeader(doc, 'juridique');
  y = drawSectionTitle(doc, 'QUALIFICATION JURIDIQUE', y, { numbered: false, color: PDF_COLORS.legal, fontSize: 16 });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setColor(doc, PDF_COLORS.text);

  const qualifIntro = `Chaque fait établi ci-dessus peut être qualifié juridiquement au regard des dispositions légales applicables. ` +
    `L'analyse qui suit identifie les bases légales pertinentes et leur application au cas d'espèce.`;
  
  const qualifLines = doc.splitTextToSize(qualifIntro, contentWidth);
  doc.text(qualifLines, marginLeft, y);
  y += qualifLines.length * 5 + 10;

  // Pour chaque incident, afficher les bases légales avec explications
  for (let i = 0; i < Math.min(sortedIncidents.length, 5); i++) {
    const incident = sortedIncidents[i];
    y = checkPageBreak(doc, y, 80);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.primary);
    doc.text(`Qualification du Fait n°${i + 1} (INC-${incident.numero})`, marginLeft, y);
    y += 8;

    // Récupérer les explications légales
    const allText = `${incident.faits} ${incident.dysfonctionnement}`;
    let legalRefs = extractLegalReferences(allText);
    if (legalRefs.length === 0) {
      legalRefs = getDefaultLegalBasesForType(incident.type);
    }

    let legalExplanations: LegalExplanation[] = [];
    try {
      legalExplanations = await fetchLegalExplanations(
        legalRefs.slice(0, 3), // Limiter à 3 pour éviter trop de contenu
        incident.faits,
        incident.dysfonctionnement,
        incident.type
      );
    } catch (e) {
      console.error('Failed to fetch legal explanations:', e);
    }

    if (legalExplanations.length > 0) {
      for (const legal of legalExplanations) {
        y = checkPageBreak(doc, y, 50);
        y = drawLegalBox(doc, y, {
          code: legal.code,
          article: legal.article,
          title: legal.title || undefined,
          text: legal.text,
          contextExplanation: legal.contextExplanation || undefined,
        });
      }
    } else {
      // Affichage basique
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      setColor(doc, PDF_COLORS.text);
      doc.text(`• Art. 406 CC - Accomplissement diligent des tâches`, marginLeft + 5, y);
      y += 5;
      doc.text(`• Art. 29 Cst. - Garanties de procédure`, marginLeft + 5, y);
      y += 10;
    }
  }

  // ============================================
  // IV. PREUVES DOCUMENTÉES
  // ============================================
  
  doc.addPage();
  y = drawPremiumHeader(doc, 'juridique');
  y = drawSectionTitle(doc, 'PREUVES DOCUMENTÉES', y, { numbered: false, color: PDF_COLORS.evidence, fontSize: 16 });

  // Tableau récapitulatif des preuves
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  setColor(doc, PDF_COLORS.secondary);

  const colHeaders = ['Réf.', 'Incident', 'Type', 'Description'];
  const colWidths = [15, 20, 25, 110];
  let xPos = marginLeft;

  for (let i = 0; i < colHeaders.length; i++) {
    doc.text(colHeaders[i], xPos, y);
    xPos += colWidths[i];
  }

  y += 3;
  setColor(doc, PDF_COLORS.border, 'draw');
  doc.line(marginLeft, y, marginLeft + contentWidth, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  setColor(doc, PDF_COLORS.text);

  let proofIndex = 1;
  for (const incident of sortedIncidents) {
    for (const preuve of incident.preuves) {
      y = checkPageBreak(doc, y, 10);
      
      xPos = marginLeft;
      doc.text(`P${proofIndex}`, xPos, y);
      xPos += colWidths[0];
      doc.text(`#${incident.numero}`, xPos, y);
      xPos += colWidths[1];
      doc.text(preuve.type || 'doc', xPos, y);
      xPos += colWidths[2];
      
      const descLines = doc.splitTextToSize(preuve.label || '-', colWidths[3] - 5);
      doc.text(descLines[0], xPos, y);
      
      y += 6;
      proofIndex++;
    }
  }

  // ============================================
  // V. CONCLUSIONS
  // ============================================
  
  doc.addPage();
  y = drawPremiumHeader(doc, 'juridique');
  y = drawSectionTitle(doc, 'CONCLUSIONS', y, { numbered: false, color: PDF_COLORS.primary, fontSize: 16 });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  setColor(doc, PDF_COLORS.text);

  const conclusionText = `Au vu des faits établis et de leur qualification juridique, il apparaît que plusieurs dysfonctionnements ` +
    `ont été constatés dans l'exercice des mesures de protection de l'adulte. ` +
    `Ces manquements portent principalement sur le non-respect des obligations de diligence (art. 406 CC), ` +
    `les violations des garanties de procédure (art. 29 Cst.) et les défauts d'information (art. 413 CC).`;

  const conclusionLines = doc.splitTextToSize(conclusionText, contentWidth);
  doc.text(conclusionLines, marginLeft, y);
  y += conclusionLines.length * 5 + 15;

  // Demandes
  doc.setFont('helvetica', 'bold');
  doc.text('Il est respectueusement demandé à l\'Autorité:', marginLeft, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  const demandes = [
    'De prendre connaissance des faits exposés dans le présent rapport;',
    'D\'examiner les mesures de surveillance appropriées (art. 450 CC);',
    'D\'évaluer la nécessité d\'un changement de curateur (art. 423 CC);',
    'De statuer sur les éventuelles mesures correctives à mettre en œuvre.',
  ];

  for (let i = 0; i < demandes.length; i++) {
    y = checkPageBreak(doc, y, 10);
    doc.text(`${i + 1}. ${demandes[i]}`, marginLeft + 5, y);
    y += 8;
  }

  y += 15;

  // Signature
  doc.text('Fait à _________________, le ' + formatPDFDate(new Date().toISOString()), marginLeft, y);
  y += 20;
  doc.text('Signature: _________________________', marginLeft, y);

  // ============================================
  // PIEDS DE PAGE
  // ============================================
  
  addFootersToAllPages(doc, 'juridique', 'Dossier Juridique - Protection de l\'Adulte');

  // Sauvegarde
  const filename = `dossier-juridique-${formatPDFDate(new Date().toISOString()).replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}

export default generateJuridiquePDF;
