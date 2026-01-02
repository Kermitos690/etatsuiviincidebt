/**
 * PDF Export Service
 * Génère des PDF en Blob pour envoi par email
 */

import jsPDF from 'jspdf';
import {
  PDF_COLORS,
  PDF_DIMENSIONS,
  setColor,
  getSeverityColor,
  drawPremiumHeader,
  drawSectionTitle,
  drawInfoTable,
  addFootersToAllPages,
  checkPageBreak,
  formatPDFDate,
  formatPDFDateTime,
  normalizeTextForPdf,
  drawJustifiedTextBlock,
} from '@/utils/pdfStyles';
import type { Incident } from '@/types/incident';

interface BuildPdfOptions {
  mode?: 'fiche' | 'dossier';
}

/**
 * Génère un PDF d'incident et retourne le Blob
 */
export async function buildIncidentPdfBlob(
  incident: Incident,
  options: BuildPdfOptions = {}
): Promise<Blob> {
  const { mode = 'fiche' } = options;
  
  const doc = new jsPDF();
  const { marginLeft, contentWidth } = PDF_DIMENSIONS;

  // ============================================
  // EN-TÊTE PREMIUM
  // ============================================
  
  let y = drawPremiumHeader(
    doc,
    'incident',
    `INC-${String(incident.numero).padStart(4, '0')}`,
    undefined
  );

  // Métadonnées de génération
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  setColor(doc, PDF_COLORS.muted);
  doc.text(`Document généré le ${formatPDFDateTime(new Date().toISOString())}`, marginLeft, y);
  
  if (incident.transmisJP && incident.dateTransmissionJP) {
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.legal);
    doc.text(`TRANSMIS AU JUGE DE PAIX LE ${formatPDFDate(incident.dateTransmissionJP)}`, marginLeft + 100, y);
  }
  y += 12;

  // ============================================
  // SECTION 1: IDENTIFICATION
  // ============================================
  
  y = drawSectionTitle(doc, 'IDENTIFICATION DE L\'INCIDENT', y, { numbered: true, number: 1 });

  // Badge de gravité
  const severityColor = getSeverityColor(incident.gravite);
  setColor(doc, severityColor, 'fill');
  doc.roundedRect(marginLeft + contentWidth - 40, y - 6, 38, 8, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  setColor(doc, PDF_COLORS.white);
  doc.text(incident.gravite.toUpperCase(), marginLeft + contentWidth - 21, y - 1, { align: 'center' });

  y = drawInfoTable(doc, y + 5, [
    { label: 'Numéro', value: `INC-${String(incident.numero).padStart(4, '0')}`, highlight: true },
    { label: 'Titre', value: normalizeTextForPdf(incident.titre, { maxLength: 80 }) },
    { label: 'Date de l\'incident', value: formatPDFDate(incident.dateIncident) },
    { label: 'Institution', value: incident.institution },
    { label: 'Type', value: incident.type },
    { label: 'Gravité', value: incident.gravite },
    { label: 'Priorité', value: incident.priorite },
    { label: 'Statut', value: incident.statut },
    { label: 'Score', value: `${incident.score}/100` },
    { label: 'Créé le', value: formatPDFDate(incident.dateCreation) },
  ]);

  y += 10;

  // ============================================
  // SECTION 2: FAITS CONSTATÉS (Probatoire)
  // ============================================
  
  y = checkPageBreak(doc, y, 60);
  y = drawSectionTitle(doc, 'FAITS CONSTATÉS (éléments probatoires)', y, { 
    numbered: true, 
    number: 2,
    color: PDF_COLORS.evidence 
  });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  setColor(doc, PDF_COLORS.muted);
  doc.text('Éléments factuels, objectifs et vérifiables : dates, actions, documents.', marginLeft, y);
  y += 6;

  const faitsText = normalizeTextForPdf(incident.faits, { maxLength: 2000 });
  doc.setFontSize(10);
  
  y = drawJustifiedTextBlock(doc, faitsText, y, {
    backgroundColor: PDF_COLORS.background,
    borderColor: PDF_COLORS.evidence,
    textColor: PDF_COLORS.text,
    fontSize: 10,
    padding: 8
  });
  y += 10;

  // ============================================
  // SECTION 3: ANALYSE & QUALIFICATION JURIDIQUE
  // ============================================
  
  y = checkPageBreak(doc, y, 60);
  y = drawSectionTitle(doc, 'ANALYSE & QUALIFICATION JURIDIQUE', y, { 
    numbered: true, 
    number: 3,
    color: PDF_COLORS.legal 
  });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  setColor(doc, PDF_COLORS.muted);
  doc.text('Interprétation juridique distincte des faits bruts.', marginLeft, y);
  y += 6;

  const dysfText = normalizeTextForPdf(incident.dysfonctionnement, { maxLength: 2000 });
  doc.setFontSize(10);
  
  y = drawJustifiedTextBlock(doc, dysfText, y, {
    backgroundColor: PDF_COLORS.background,
    borderColor: PDF_COLORS.legal,
    textColor: PDF_COLORS.text,
    fontSize: 10,
    padding: 8
  });
  y += 10;

  // ============================================
  // SECTION 4: NOTES D'ANALYSE (si présentes)
  // ============================================
  
  if (incident.analysisNotes) {
    y = checkPageBreak(doc, y, 40);
    y = drawSectionTitle(doc, 'NOTES D\'ANALYSE (assistance – non probatoire)', y, { 
      numbered: true, 
      number: 4,
      color: PDF_COLORS.muted 
    });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    setColor(doc, PDF_COLORS.text);

    const notesText = normalizeTextForPdf(incident.analysisNotes, { maxLength: 1000 });
    const notesLines = doc.splitTextToSize(notesText, contentWidth - 10);
    const notesHeight = notesLines.length * 4 + 8;

    y = checkPageBreak(doc, y, notesHeight);

    setColor(doc, { r: 250, g: 250, b: 250 }, 'fill');
    doc.roundedRect(marginLeft, y - 3, contentWidth, notesHeight, 2, 2, 'F');
    
    setColor(doc, PDF_COLORS.text);
    doc.text(notesLines, marginLeft + 5, y + 3);
    y += notesHeight + 10;
  }

  // ============================================
  // SECTION 5: PREUVES
  // ============================================
  
  if (incident.preuves && incident.preuves.length > 0) {
    y = checkPageBreak(doc, y, 40);
    y = drawSectionTitle(doc, 'ÉLÉMENTS DE PREUVE', y, { 
      numbered: true, 
      number: incident.analysisNotes ? 5 : 4,
      color: PDF_COLORS.evidence 
    });

    for (const preuve of incident.preuves) {
      y = checkPageBreak(doc, y, 12);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      setColor(doc, PDF_COLORS.primary);
      doc.text(`• ${preuve.type}`, marginLeft + 3, y);
      
      doc.setFont('helvetica', 'normal');
      setColor(doc, PDF_COLORS.text);
      doc.text(normalizeTextForPdf(preuve.label, { maxLength: 100 }), marginLeft + 30, y);
      
      y += 6;
    }
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

  const disclaimer = incident.transmisJP 
    ? 'Ce document fait partie d\'un dossier transmis à l\'autorité judiciaire. Son contenu est figé à des fins probatoires et ne peut être modifié.'
    : 'Ce document est établi conformément à la Loi fédérale sur la protection des données (LPD) et aux dispositions du Code civil suisse relatives à la protection de l\'adulte.';

  const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth - 10);
  doc.text(disclaimerLines, marginLeft + 5, y + 6);

  // ============================================
  // PIEDS DE PAGE
  // ============================================
  
  addFootersToAllPages(doc, 'incident', `INC-${String(incident.numero).padStart(4, '0')}`);

  // Retourne le Blob
  return doc.output('blob');
}

/**
 * Convertit un Blob en base64
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Enlève le préfixe data:application/pdf;base64,
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Génère le nom de fichier pour le PDF
 */
export function generatePdfFilename(incident: Incident): string {
  const numero = String(incident.numero).padStart(4, '0');
  const date = new Date().toISOString().split('T')[0];
  const safeTitre = incident.titre
    .replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç]/g, '_')
    .substring(0, 30);
  return `INC-${numero}_${safeTitre}_${date}.pdf`;
}
