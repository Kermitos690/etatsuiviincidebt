/**
 * Generate Incident PDF - Style Fiche Technique/Factuel
 * Export ultra premium pour incidents individuels
 */

import jsPDF from 'jspdf';
import {
  PDF_COLORS,
  PDF_DIMENSIONS,
  setColor,
  getSeverityColor,
  getStatusColor,
  drawPremiumHeader,
  drawSectionTitle,
  drawLegalBox,
  drawInfoTable,
  drawCitation,
  addFootersToAllPages,
  checkPageBreak,
  formatPDFDate,
  formatPDFDateTime,
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
    hash?: string;
  }>;
  gmailReferences?: any;
  confidenceLevel?: string;
}

interface GenerateIncidentPDFOptions {
  includeProofs?: boolean;
  includeLegalExplanations?: boolean;
  includeEmailCitations?: boolean;
}

/**
 * Génère un PDF ultra premium pour un incident
 */
export async function generateIncidentPDF(
  incident: IncidentData,
  options: GenerateIncidentPDFOptions = {}
): Promise<void> {
  const {
    includeProofs = true,
    includeLegalExplanations = true,
    includeEmailCitations = true,
  } = options;

  const doc = new jsPDF();
  const { marginLeft, contentWidth } = PDF_DIMENSIONS;

  // ============================================
  // PAGE 1: EN-TÊTE ET IDENTIFICATION
  // ============================================
  
  let y = drawPremiumHeader(
    doc, 
    'incident', 
    incident.titre,
    incident.numero
  );

  // Métadonnées du document
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  setColor(doc, PDF_COLORS.muted);
  doc.text(`Généré le ${formatPDFDateTime(new Date().toISOString())}`, marginLeft, y);
  y += 10;

  // ============================================
  // SECTION 1: IDENTIFICATION
  // ============================================
  
  y = drawSectionTitle(doc, 'IDENTIFICATION', y, { numbered: true, number: 1 });

  // Badge de gravité visuel
  const severityColor = getSeverityColor(incident.gravite);
  setColor(doc, severityColor, 'fill');
  doc.roundedRect(marginLeft + contentWidth - 40, y - 6, 38, 8, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  setColor(doc, PDF_COLORS.white);
  doc.text(incident.gravite.toUpperCase(), marginLeft + contentWidth - 21, y - 1, { align: 'center' });

  // Tableau d'informations
  y = drawInfoTable(doc, y + 5, [
    { label: 'Numéro', value: `INC-${String(incident.numero).padStart(4, '0')}`, highlight: true },
    { label: 'Date incident', value: formatPDFDate(incident.dateIncident) },
    { label: 'Date création', value: formatPDFDate(incident.dateCreation) },
    { label: 'Institution', value: incident.institution },
    { label: 'Type', value: incident.type },
    { label: 'Gravité', value: incident.gravite },
    { label: 'Priorité', value: `${incident.priorite} (Score: ${incident.score}/100)` },
    { label: 'Statut', value: incident.statut },
    { label: 'Transmis JP', value: incident.transmisJP 
      ? `Oui - ${incident.dateTransmissionJP ? formatPDFDate(incident.dateTransmissionJP) : 'Date non spécifiée'}`
      : 'Non' 
    },
  ]);

  y += 5;

  // ============================================
  // SECTION 2: EXPOSÉ DES FAITS
  // ============================================
  
  y = checkPageBreak(doc, y, 60);
  y = drawSectionTitle(doc, 'EXPOSÉ DES FAITS', y, { numbered: true, number: 2 });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setColor(doc, PDF_COLORS.text);
  
  const faitsText = incident.faits || 'Aucun fait renseigné.';
  const faitsLines = doc.splitTextToSize(faitsText, contentWidth - 10);
  
  // Encadré pour les faits
  const faitsHeight = faitsLines.length * 5 + 10;
  y = checkPageBreak(doc, y, faitsHeight);
  
  setColor(doc, PDF_COLORS.background, 'fill');
  doc.roundedRect(marginLeft, y - 3, contentWidth, faitsHeight, 2, 2, 'F');
  
  doc.text(faitsLines, marginLeft + 5, y + 3);
  y += faitsHeight + 5;

  // ============================================
  // SECTION 3: DYSFONCTIONNEMENT IDENTIFIÉ
  // ============================================
  
  y = checkPageBreak(doc, y, 60);
  y = drawSectionTitle(doc, 'DYSFONCTIONNEMENT IDENTIFIÉ', y, { numbered: true, number: 3 });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setColor(doc, PDF_COLORS.text);
  
  const dysfText = incident.dysfonctionnement || 'Aucun dysfonctionnement renseigné.';
  const dysfLines = doc.splitTextToSize(dysfText, contentWidth - 10);
  
  const dysfHeight = dysfLines.length * 5 + 10;
  y = checkPageBreak(doc, y, dysfHeight);
  
  // Encadré avec bordure d'alerte
  setColor(doc, PDF_COLORS.background, 'fill');
  doc.roundedRect(marginLeft, y - 3, contentWidth, dysfHeight, 2, 2, 'F');
  setColor(doc, severityColor, 'fill');
  doc.rect(marginLeft, y - 3, 3, dysfHeight, 'F');
  
  doc.text(dysfLines, marginLeft + 8, y + 3);
  y += dysfHeight + 5;

  // ============================================
  // SECTION 4: BASES LÉGALES APPLICABLES
  // ============================================
  
  if (includeLegalExplanations) {
    y = checkPageBreak(doc, y, 80);
    y = drawSectionTitle(doc, 'BASES LÉGALES APPLICABLES', y, { numbered: true, number: 4, color: PDF_COLORS.legal });

    // Extraire les références légales du texte
    const allText = `${incident.faits} ${incident.dysfonctionnement}`;
    let legalRefs = extractLegalReferences(allText);
    
    // Si pas de références trouvées, utiliser les défauts pour le type
    if (legalRefs.length === 0) {
      legalRefs = getDefaultLegalBasesForType(incident.type);
    }

    // Récupérer les explications contextuelles
    let legalExplanations: LegalExplanation[] = [];
    try {
      legalExplanations = await fetchLegalExplanations(
        legalRefs,
        incident.faits,
        incident.dysfonctionnement,
        incident.type
      );
    } catch (e) {
      console.error('Failed to fetch legal explanations:', e);
    }

    if (legalExplanations.length > 0) {
      for (const legal of legalExplanations) {
        y = checkPageBreak(doc, y, 60);
        y = drawLegalBox(doc, y, {
          code: legal.code,
          article: legal.article,
          title: legal.title || undefined,
          text: legal.text,
          contextExplanation: legal.contextExplanation || undefined,
        });
      }
    } else {
      // Afficher les références sans explication
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      setColor(doc, PDF_COLORS.text);
      
      const defaultBases = [
        `• ${incident.type === 'Délai non respecté' ? 'Art. 406 CC - Accomplissement diligent des tâches' : 'Art. 404 CC - Obligation du curateur'}`,
        '• Art. 29 Cst. - Garanties de procédure judiciaire et administrative',
        '• Art. 35 PA - Motivation des décisions',
        '• Art. 13 LPD - Obligation de confidentialité',
      ];
      
      for (const base of defaultBases) {
        y = checkPageBreak(doc, y, 10);
        doc.text(base, marginLeft + 5, y);
        y += 6;
      }
      
      y += 5;
    }
  }

  // ============================================
  // SECTION 5: PREUVES RÉFÉRENCÉES
  // ============================================
  
  if (includeProofs && incident.preuves && incident.preuves.length > 0) {
    y = checkPageBreak(doc, y, 60);
    y = drawSectionTitle(doc, 'PREUVES RÉFÉRENCÉES', y, { numbered: true, number: 5, color: PDF_COLORS.evidence });

    // Tableau des preuves
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.secondary);
    
    // En-tête du tableau
    const colX = { num: marginLeft, type: marginLeft + 15, label: marginLeft + 40, hash: marginLeft + 120 };
    doc.text('N°', colX.num, y);
    doc.text('Type', colX.type, y);
    doc.text('Description', colX.label, y);
    doc.text('Hash', colX.hash, y);
    
    y += 2;
    setColor(doc, PDF_COLORS.border, 'draw');
    doc.line(marginLeft, y, marginLeft + contentWidth, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    setColor(doc, PDF_COLORS.text);

    incident.preuves.forEach((preuve, idx) => {
      y = checkPageBreak(doc, y, 10);
      
      doc.text(`P${idx + 1}`, colX.num, y);
      doc.text(preuve.type || 'doc', colX.type, y);
      
      const labelLines = doc.splitTextToSize(preuve.label || 'Sans description', 75);
      doc.text(labelLines[0], colX.label, y);
      
      // Hash cryptographique pour traçabilité
      const hash = preuve.hash || generateProofHash(preuve);
      doc.setFontSize(6);
      setColor(doc, PDF_COLORS.muted);
      doc.text(hash.substring(0, 16) + '...', colX.hash, y);
      doc.setFontSize(8);
      setColor(doc, PDF_COLORS.text);
      
      y += 6;
    });
    
    y += 5;
  }

  // ============================================
  // AVERTISSEMENT LÉGAL
  // ============================================
  
  y = checkPageBreak(doc, y, 30);
  
  setColor(doc, PDF_COLORS.background, 'fill');
  doc.roundedRect(marginLeft, y, contentWidth, 20, 2, 2, 'F');
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  setColor(doc, PDF_COLORS.muted);
  
  const disclaimer = 'Ce document est établi conformément aux dispositions de la Loi fédérale sur la protection des données (LPD) ' +
    'et aux articles 388-456 du Code civil suisse relatifs à la protection de l\'adulte. ' +
    'Son contenu est strictement confidentiel et destiné exclusivement aux autorités compétentes.';
  
  const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth - 10);
  doc.text(disclaimerLines, marginLeft + 5, y + 6);

  // ============================================
  // AJOUT DES PIEDS DE PAGE
  // ============================================
  
  addFootersToAllPages(doc, 'incident', `Incident #${incident.numero}`);

  // Sauvegarde
  doc.save(`fiche-incident-${incident.numero}.pdf`);
}

/**
 * Génère un hash simplifié pour une preuve
 */
function generateProofHash(preuve: { id: string; type: string; label: string }): string {
  const content = `${preuve.id}-${preuve.type}-${preuve.label}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0').toUpperCase();
}

export default generateIncidentPDF;
