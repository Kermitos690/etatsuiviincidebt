/**
 * PDF Styles - Système centralisé de styles pour exports PDF ultra premium
 * Palette institutionnelle sobre pour autorités publiques
 */

import jsPDF from 'jspdf';

// ============================================
// PALETTE DE COULEURS INSTITUTIONNELLE (RGB)
// ============================================
export const PDF_COLORS = {
  // Couleurs principales
  primary: { r: 26, g: 54, b: 93 },       // Marine - En-têtes, titres
  secondary: { r: 71, g: 85, b: 105 },    // Gris ardoise - Sous-titres
  
  // Niveaux de gravité
  critique: { r: 185, g: 28, b: 28 },     // Rouge - Urgence/Critique
  haute: { r: 180, g: 83, b: 9 },         // Orange - Haute priorité
  moyenne: { r: 161, g: 98, b: 7 },       // Ambre - Moyenne priorité
  faible: { r: 21, g: 128, b: 61 },       // Vert - Faible/Résolu
  
  // Neutres
  text: { r: 30, g: 41, b: 59 },          // Texte principal
  muted: { r: 100, g: 116, b: 139 },      // Texte secondaire
  light: { r: 148, g: 163, b: 184 },      // Texte léger
  
  // Fonds
  background: { r: 248, g: 250, b: 252 }, // Fond sections
  white: { r: 255, g: 255, b: 255 },      // Blanc
  border: { r: 226, g: 232, b: 240 },     // Bordures
  
  // Accents juridiques
  legal: { r: 88, g: 28, b: 135 },        // Violet - Références légales
  evidence: { r: 13, g: 148, b: 136 },    // Teal - Preuves
} as const;

// ============================================
// DIMENSIONS ET MARGES (en mm)
// ============================================
export const PDF_DIMENSIONS = {
  pageWidth: 210,
  pageHeight: 297,
  marginLeft: 20,
  marginRight: 20,
  marginTop: 20,
  marginBottom: 25,
  contentWidth: 170, // 210 - 20 - 20
  
  // Espacements
  lineHeight: 5,
  paragraphGap: 8,
  sectionGap: 15,
  
  // En-têtes/pieds de page
  headerHeight: 35,
  footerHeight: 15,
} as const;

// ============================================
// TYPES DE DOCUMENTS
// ============================================
export type PDFDocumentType = 
  | 'incident'           // Fiche Incident - Technique/Factuel
  | 'weekly'             // Rapport Hebdomadaire - Exécutif
  | 'semiannual'         // Rapport Semestriel - Officiel
  | 'juridique'          // Dossier Justice de Paix - Formel
  | 'chronologique'      // Analyse chronologique - Timeline
  | 'complete';          // Dossier complet - Mémoire

// ============================================
// CONFIGURATION PAR TYPE
// ============================================
export const PDF_TYPE_CONFIG: Record<PDFDocumentType, {
  title: string;
  headerColor: typeof PDF_COLORS[keyof typeof PDF_COLORS];
  accentColor: typeof PDF_COLORS[keyof typeof PDF_COLORS];
  confidentialNote: string;
  showLegalDisclaimer: boolean;
}> = {
  incident: {
    title: 'FICHE INCIDENT',
    headerColor: PDF_COLORS.primary,
    accentColor: PDF_COLORS.secondary,
    confidentialNote: 'Confidentiel - Art. 13 LPD',
    showLegalDisclaimer: true,
  },
  weekly: {
    title: 'RAPPORT HEBDOMADAIRE',
    headerColor: PDF_COLORS.primary,
    accentColor: PDF_COLORS.evidence,
    confidentialNote: 'Document interne - Confidentiel',
    showLegalDisclaimer: false,
  },
  semiannual: {
    title: 'RAPPORT SEMESTRIEL',
    headerColor: PDF_COLORS.primary,
    accentColor: PDF_COLORS.legal,
    confidentialNote: 'Document officiel - Usage restreint',
    showLegalDisclaimer: true,
  },
  juridique: {
    title: 'DOSSIER JURIDIQUE',
    headerColor: PDF_COLORS.primary,
    accentColor: PDF_COLORS.legal,
    confidentialNote: 'Destiné à la Justice de Paix - Confidentiel',
    showLegalDisclaimer: true,
  },
  chronologique: {
    title: 'ANALYSE CHRONOLOGIQUE',
    headerColor: PDF_COLORS.secondary,
    accentColor: PDF_COLORS.primary,
    confidentialNote: 'Document de travail - Confidentiel',
    showLegalDisclaimer: false,
  },
  complete: {
    title: 'DOSSIER COMPLET',
    headerColor: PDF_COLORS.primary,
    accentColor: PDF_COLORS.evidence,
    confidentialNote: 'Mémoire juridique - Art. 13 LPD',
    showLegalDisclaimer: true,
  },
};

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Applique une couleur RGB au document
 */
export function setColor(doc: jsPDF, color: { r: number; g: number; b: number }, type: 'text' | 'fill' | 'draw' = 'text') {
  if (type === 'text') {
    doc.setTextColor(color.r, color.g, color.b);
  } else if (type === 'fill') {
    doc.setFillColor(color.r, color.g, color.b);
  } else {
    doc.setDrawColor(color.r, color.g, color.b);
  }
}

/**
 * Retourne la couleur selon la gravité
 */
export function getSeverityColor(gravite: string): typeof PDF_COLORS[keyof typeof PDF_COLORS] {
  switch (gravite?.toLowerCase()) {
    case 'critique':
      return PDF_COLORS.critique;
    case 'haute':
    case 'grave':
      return PDF_COLORS.haute;
    case 'moyenne':
    case 'modéré':
      return PDF_COLORS.moyenne;
    case 'faible':
    case 'mineur':
      return PDF_COLORS.faible;
    default:
      return PDF_COLORS.muted;
  }
}

/**
 * Retourne la couleur selon le statut
 */
export function getStatusColor(statut: string): typeof PDF_COLORS[keyof typeof PDF_COLORS] {
  switch (statut?.toLowerCase()) {
    case 'ouvert':
      return PDF_COLORS.haute;
    case 'en cours':
      return PDF_COLORS.moyenne;
    case 'transmis':
      return PDF_COLORS.legal;
    case 'fermé':
    case 'résolu':
      return PDF_COLORS.faible;
    default:
      return PDF_COLORS.muted;
  }
}

// ============================================
// COMPOSANTS PDF RÉUTILISABLES
// ============================================

/**
 * Dessine l'en-tête premium du document
 */
export function drawPremiumHeader(
  doc: jsPDF, 
  type: PDFDocumentType, 
  subtitle?: string,
  documentNumber?: string | number
): number {
  const config = PDF_TYPE_CONFIG[type];
  const { marginLeft, pageWidth, marginRight } = PDF_DIMENSIONS;
  
  // Bande de couleur en haut
  setColor(doc, config.headerColor, 'fill');
  doc.rect(0, 0, pageWidth, 12, 'F');
  
  // Titre principal
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  setColor(doc, config.headerColor);
  let titleText = config.title;
  if (documentNumber) {
    titleText += ` #${documentNumber}`;
  }
  doc.text(titleText, marginLeft, 28);
  
  // Sous-titre
  if (subtitle) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    setColor(doc, PDF_COLORS.secondary);
    const subtitleLines = doc.splitTextToSize(subtitle, pageWidth - marginLeft - marginRight);
    doc.text(subtitleLines, marginLeft, 36);
  }
  
  // Ligne de séparation
  const lineY = subtitle ? 42 : 34;
  setColor(doc, config.headerColor, 'draw');
  doc.setLineWidth(0.5);
  doc.line(marginLeft, lineY, pageWidth - marginRight, lineY);
  
  return lineY + 10; // Retourne la position Y après l'en-tête
}

/**
 * Dessine le pied de page premium
 */
export function drawPremiumFooter(
  doc: jsPDF,
  type: PDFDocumentType,
  pageNumber: number,
  totalPages: number,
  additionalInfo?: string
): void {
  const config = PDF_TYPE_CONFIG[type];
  const { marginLeft, pageWidth, marginRight, pageHeight, marginBottom } = PDF_DIMENSIONS;
  const footerY = pageHeight - marginBottom + 10;
  
  // Ligne de séparation
  setColor(doc, PDF_COLORS.border, 'draw');
  doc.setLineWidth(0.3);
  doc.line(marginLeft, footerY - 5, pageWidth - marginRight, footerY - 5);
  
  // Texte gauche - Confidentialité
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  setColor(doc, PDF_COLORS.muted);
  doc.text(config.confidentialNote, marginLeft, footerY);
  
  // Texte centre - Info additionnelle
  if (additionalInfo) {
    const centerX = pageWidth / 2;
    doc.text(additionalInfo, centerX, footerY, { align: 'center' });
  }
  
  // Texte droite - Pagination
  doc.setFont('helvetica', 'normal');
  doc.text(`Page ${pageNumber}/${totalPages}`, pageWidth - marginRight, footerY, { align: 'right' });
}

/**
 * Dessine un titre de section
 */
export function drawSectionTitle(
  doc: jsPDF,
  title: string,
  y: number,
  options: {
    numbered?: boolean;
    number?: number;
    color?: typeof PDF_COLORS[keyof typeof PDF_COLORS];
    fontSize?: number;
    underline?: boolean;
  } = {}
): number {
  const { marginLeft, pageWidth, marginRight } = PDF_DIMENSIONS;
  const { numbered = false, number, color = PDF_COLORS.primary, fontSize = 14, underline = true } = options;
  
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'bold');
  setColor(doc, color);
  
  let text = title;
  if (numbered && number !== undefined) {
    text = `${number}. ${title}`;
  }
  
  doc.text(text, marginLeft, y);
  
  if (underline) {
    const textWidth = doc.getTextWidth(text);
    setColor(doc, color, 'draw');
    doc.setLineWidth(0.3);
    doc.line(marginLeft, y + 1.5, marginLeft + textWidth, y + 1.5);
  }
  
  return y + 8; // Retourne la position Y après le titre
}

/**
 * Dessine un encadré de base légale avec explication
 */
export function drawLegalBox(
  doc: jsPDF,
  y: number,
  legalRef: {
    code: string;
    article: string;
    title?: string;
    text: string;
    contextExplanation?: string;
  }
): number {
  const { marginLeft, contentWidth } = PDF_DIMENSIONS;
  
  // Calcul de la hauteur nécessaire
  doc.setFontSize(9);
  const textLines = doc.splitTextToSize(legalRef.text, contentWidth - 15);
  const explanationLines = legalRef.contextExplanation 
    ? doc.splitTextToSize(legalRef.contextExplanation, contentWidth - 15)
    : [];
  
  const boxHeight = 20 + (textLines.length * 4) + (explanationLines.length > 0 ? 15 + (explanationLines.length * 4) : 0);
  
  // Vérifier si on a besoin d'une nouvelle page
  if (y + boxHeight > 270) {
    doc.addPage();
    y = 25;
  }
  
  // Fond de l'encadré
  setColor(doc, PDF_COLORS.background, 'fill');
  doc.roundedRect(marginLeft, y, contentWidth, boxHeight, 2, 2, 'F');
  
  // Bordure gauche colorée
  setColor(doc, PDF_COLORS.legal, 'fill');
  doc.rect(marginLeft, y, 3, boxHeight, 'F');
  
  // En-tête de l'article
  let currentY = y + 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  setColor(doc, PDF_COLORS.legal);
  const headerText = `${legalRef.code} art. ${legalRef.article}${legalRef.title ? ` - ${legalRef.title}` : ''}`;
  doc.text(headerText, marginLeft + 8, currentY);
  
  // Texte de l'article
  currentY += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  setColor(doc, PDF_COLORS.text);
  doc.text(textLines, marginLeft + 8, currentY);
  currentY += textLines.length * 4 + 2;
  
  // Explication contextuelle
  if (legalRef.contextExplanation && explanationLines.length > 0) {
    currentY += 3;
    doc.setFont('helvetica', 'bolditalic');
    setColor(doc, PDF_COLORS.secondary);
    doc.text('Application au cas présent :', marginLeft + 8, currentY);
    currentY += 5;
    
    doc.setFont('helvetica', 'italic');
    doc.text(explanationLines, marginLeft + 8, currentY);
    currentY += explanationLines.length * 4;
  }
  
  return y + boxHeight + 8;
}

/**
 * Dessine un tableau d'informations clé-valeur
 */
export function drawInfoTable(
  doc: jsPDF,
  y: number,
  data: Array<{ label: string; value: string; highlight?: boolean }>
): number {
  const { marginLeft } = PDF_DIMENSIONS;
  let currentY = y;
  
  for (const item of data) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.secondary);
    doc.text(`${item.label}:`, marginLeft + 5, currentY);
    
    doc.setFont('helvetica', 'normal');
    if (item.highlight) {
      setColor(doc, PDF_COLORS.primary);
    } else {
      setColor(doc, PDF_COLORS.text);
    }
    
    const valueLines = doc.splitTextToSize(item.value, 120);
    doc.text(valueLines, marginLeft + 50, currentY);
    currentY += valueLines.length * 5 + 2;
  }
  
  return currentY + 5;
}

/**
 * Dessine un KPI box pour dashboards
 */
export function drawKPIBox(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string | number,
  color: typeof PDF_COLORS[keyof typeof PDF_COLORS] = PDF_COLORS.primary
): void {
  // Fond
  setColor(doc, PDF_COLORS.background, 'fill');
  doc.roundedRect(x, y, width, height, 2, 2, 'F');
  
  // Bordure supérieure colorée
  setColor(doc, color, 'fill');
  doc.rect(x, y, width, 3, 'F');
  
  // Valeur
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  setColor(doc, color);
  doc.text(String(value), x + width / 2, y + height / 2, { align: 'center' });
  
  // Label
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setColor(doc, PDF_COLORS.muted);
  doc.text(label, x + width / 2, y + height - 5, { align: 'center' });
}

/**
 * Dessine une barre de progression
 */
export function drawProgressBar(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  percentage: number,
  color: typeof PDF_COLORS[keyof typeof PDF_COLORS]
): void {
  const height = 4;
  
  // Fond
  setColor(doc, PDF_COLORS.border, 'fill');
  doc.roundedRect(x, y, width, height, 1, 1, 'F');
  
  // Progression
  const progressWidth = (width * percentage) / 100;
  if (progressWidth > 0) {
    setColor(doc, color, 'fill');
    doc.roundedRect(x, y, progressWidth, height, 1, 1, 'F');
  }
}

/**
 * Dessine une citation numérotée
 */
export function drawCitation(
  doc: jsPDF,
  y: number,
  citationNumber: number,
  text: string,
  source?: string
): number {
  const { marginLeft, contentWidth } = PDF_DIMENSIONS;
  
  // Numéro de citation
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  setColor(doc, PDF_COLORS.evidence);
  doc.text(`[${citationNumber}]`, marginLeft + 5, y);
  
  // Texte de la citation
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  setColor(doc, PDF_COLORS.text);
  const lines = doc.splitTextToSize(`"${text}"`, contentWidth - 25);
  doc.text(lines, marginLeft + 15, y);
  
  let currentY = y + lines.length * 4;
  
  // Source
  if (source) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    setColor(doc, PDF_COLORS.muted);
    doc.text(`— ${source}`, marginLeft + 15, currentY + 3);
    currentY += 6;
  }
  
  return currentY + 5;
}

/**
 * Ajoute les pieds de page à toutes les pages
 */
export function addFootersToAllPages(
  doc: jsPDF,
  type: PDFDocumentType,
  documentInfo?: string
): void {
  const totalPages = doc.getNumberOfPages();
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPremiumFooter(doc, type, i, totalPages, documentInfo);
  }
}

/**
 * Vérifie si on a besoin d'une nouvelle page et l'ajoute si nécessaire
 */
export function checkPageBreak(doc: jsPDF, currentY: number, requiredSpace: number = 40): number {
  if (currentY + requiredSpace > 270) {
    doc.addPage();
    return 25;
  }
  return currentY;
}

/**
 * Formatte une date pour affichage PDF
 */
export function formatPDFDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formatte une date et heure pour affichage PDF
 */
export function formatPDFDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}
