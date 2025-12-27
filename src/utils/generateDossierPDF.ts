/**
 * Generate Complete Dossier PDF
 * Export complet d'un dossier/situation avec tous les documents et analyses
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
  drawInfoTable,
  addFootersToAllPages,
  checkPageBreak,
  formatPDFDate,
  formatPDFDateTime,
} from './pdfStyles';

interface DossierData {
  folder: {
    id: string;
    name: string;
    description?: string;
    situation_type?: string;
    situation_status?: string;
    priority?: string;
    institution_concerned?: string;
    summary?: string;
    problem_score?: number;
    participants?: Array<{
      name: string;
      role?: string;
      email?: string;
      institution?: string;
    }>;
    violations_detected?: Array<{
      type: string;
      severity: string;
      legal_ref?: string;
      description?: string;
    }>;
    recommendations?: Array<{
      action: string;
      priority: string;
      deadline?: string;
    }>;
    timeline?: Array<{
      date: string;
      event: string;
      type?: string;
    }>;
    created_at: string;
    updated_at: string;
  };
  documents: Array<{
    id: string;
    filename: string;
    original_filename: string;
    document_type?: string;
    page_count?: number;
    created_at: string;
    tags?: string[];
  }>;
  analyses?: Array<{
    id: string;
    summary?: string;
    severity?: string;
    legal_references?: any[];
    analyzed_at?: string;
  }>;
  incidents?: Array<{
    id: string;
    numero: number;
    titre: string;
    gravite: string;
    statut: string;
    date_incident: string;
  }>;
}

interface GenerateDossierPDFOptions {
  includeDocumentList?: boolean;
  includeTimeline?: boolean;
  includeParticipants?: boolean;
  includeIncidents?: boolean;
  includeLegalAnalysis?: boolean;
}

export async function generateDossierPDF(
  dossier: DossierData,
  options: GenerateDossierPDFOptions = {}
): Promise<void> {
  const {
    includeDocumentList = true,
    includeTimeline = true,
    includeParticipants = true,
    includeIncidents = true,
    includeLegalAnalysis = true,
  } = options;

  const doc = new jsPDF();
  const { marginLeft, contentWidth } = PDF_DIMENSIONS;
  const folder = dossier.folder;

  // ============================================
  // PAGE 1: EN-TÊTE ET SYNTHÈSE
  // ============================================

  let y = drawPremiumHeader(
    doc,
    'incident',
    folder.name,
    undefined
  );

  // Métadonnées
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  setColor(doc, PDF_COLORS.muted);
  doc.text(`Dossier généré le ${formatPDFDateTime(new Date().toISOString())}`, marginLeft, y);
  y += 10;

  // ============================================
  // SECTION 1: IDENTIFICATION DU DOSSIER
  // ============================================

  y = drawSectionTitle(doc, 'IDENTIFICATION', y, { numbered: true, number: 1 });

  // Badge de priorité
  if (folder.priority) {
    const priorityColor = getSeverityColor(folder.priority);
    setColor(doc, priorityColor, 'fill');
    doc.roundedRect(marginLeft + contentWidth - 40, y - 6, 38, 8, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.white);
    doc.text(folder.priority.toUpperCase(), marginLeft + contentWidth - 21, y - 1, { align: 'center' });
  }

  y = drawInfoTable(doc, y + 5, [
    { label: 'Nom du dossier', value: folder.name, highlight: true },
    { label: 'Type', value: folder.situation_type || 'Non spécifié' },
    { label: 'Statut', value: folder.situation_status || 'En cours' },
    { label: 'Institution', value: folder.institution_concerned || 'Non spécifiée' },
    { label: 'Score de gravité', value: folder.problem_score ? `${folder.problem_score}/100` : 'Non évalué' },
    { label: 'Documents', value: `${dossier.documents.length} fichier(s)` },
    { label: 'Créé le', value: formatPDFDate(folder.created_at) },
    { label: 'Mis à jour', value: formatPDFDate(folder.updated_at) },
  ]);

  y += 5;

  // ============================================
  // SECTION 2: SYNTHÈSE
  // ============================================

  if (folder.summary) {
    y = checkPageBreak(doc, y, 60);
    y = drawSectionTitle(doc, 'SYNTHÈSE DE LA SITUATION', y, { numbered: true, number: 2 });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    setColor(doc, PDF_COLORS.text);

    const summaryLines = doc.splitTextToSize(folder.summary, contentWidth - 10);
    const summaryHeight = summaryLines.length * 5 + 10;

    y = checkPageBreak(doc, y, summaryHeight);

    setColor(doc, PDF_COLORS.background, 'fill');
    doc.roundedRect(marginLeft, y - 3, contentWidth, summaryHeight, 2, 2, 'F');

    doc.text(summaryLines, marginLeft + 5, y + 3);
    y += summaryHeight + 5;
  }

  // ============================================
  // SECTION 3: PARTICIPANTS
  // ============================================

  if (includeParticipants && folder.participants && folder.participants.length > 0) {
    y = checkPageBreak(doc, y, 60);
    y = drawSectionTitle(doc, 'ACTEURS IMPLIQUÉS', y, { numbered: true, number: 3 });

    const colX = { name: marginLeft, role: marginLeft + 50, institution: marginLeft + 100 };

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.secondary);
    doc.text('Nom', colX.name, y);
    doc.text('Rôle', colX.role, y);
    doc.text('Institution', colX.institution, y);

    y += 2;
    setColor(doc, PDF_COLORS.border, 'draw');
    doc.line(marginLeft, y, marginLeft + contentWidth, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    setColor(doc, PDF_COLORS.text);

    for (const participant of folder.participants) {
      y = checkPageBreak(doc, y, 8);
      doc.text(participant.name || 'Inconnu', colX.name, y);
      doc.text(participant.role || '-', colX.role, y);
      doc.text(participant.institution || '-', colX.institution, y);
      y += 6;
    }

    y += 5;
  }

  // ============================================
  // SECTION 4: VIOLATIONS DÉTECTÉES
  // ============================================

  if (includeLegalAnalysis && folder.violations_detected && folder.violations_detected.length > 0) {
    y = checkPageBreak(doc, y, 60);
    y = drawSectionTitle(doc, 'VIOLATIONS DÉTECTÉES', y, { numbered: true, number: 4, color: PDF_COLORS.critique });

    for (const violation of folder.violations_detected) {
      y = checkPageBreak(doc, y, 30);

      // Severity indicator
      const severityColor = getSeverityColor(violation.severity);
      setColor(doc, severityColor, 'fill');
      doc.circle(marginLeft + 3, y, 2, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      setColor(doc, PDF_COLORS.text);
      doc.text(violation.type, marginLeft + 8, y + 1);

      if (violation.legal_ref) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        setColor(doc, PDF_COLORS.legal);
        doc.text(`Réf: ${violation.legal_ref}`, marginLeft + 8, y + 6);
        y += 5;
      }

      if (violation.description) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        setColor(doc, PDF_COLORS.muted);
        const descLines = doc.splitTextToSize(violation.description, contentWidth - 15);
        doc.text(descLines, marginLeft + 8, y + 6);
        y += descLines.length * 4;
      }

      y += 8;
    }
  }

  // ============================================
  // SECTION 5: TIMELINE
  // ============================================

  if (includeTimeline && folder.timeline && folder.timeline.length > 0) {
    y = checkPageBreak(doc, y, 60);
    y = drawSectionTitle(doc, 'CHRONOLOGIE DES ÉVÉNEMENTS', y, { numbered: true, number: 5 });

    for (const event of folder.timeline.slice(0, 20)) {
      y = checkPageBreak(doc, y, 15);

      // Timeline dot and line
      setColor(doc, PDF_COLORS.primary, 'fill');
      doc.circle(marginLeft + 3, y, 2, 'F');

      if (folder.timeline.indexOf(event) < folder.timeline.length - 1) {
        setColor(doc, PDF_COLORS.border, 'draw');
        doc.line(marginLeft + 3, y + 3, marginLeft + 3, y + 12);
      }

      // Date
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      setColor(doc, PDF_COLORS.primary);
      doc.text(formatPDFDate(event.date), marginLeft + 8, y);

      // Event
      doc.setFont('helvetica', 'normal');
      setColor(doc, PDF_COLORS.text);
      const eventLines = doc.splitTextToSize(event.event, contentWidth - 20);
      doc.text(eventLines[0], marginLeft + 35, y);

      y += 10;
    }

    y += 5;
  }

  // ============================================
  // SECTION 6: DOCUMENTS DU DOSSIER
  // ============================================

  if (includeDocumentList && dossier.documents.length > 0) {
    y = checkPageBreak(doc, y, 60);
    y = drawSectionTitle(doc, 'DOCUMENTS DU DOSSIER', y, { numbered: true, number: 6, color: PDF_COLORS.evidence });

    const colX = { num: marginLeft, name: marginLeft + 15, type: marginLeft + 100, pages: marginLeft + 140 };

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.secondary);
    doc.text('N°', colX.num, y);
    doc.text('Fichier', colX.name, y);
    doc.text('Type', colX.type, y);
    doc.text('Pages', colX.pages, y);

    y += 2;
    setColor(doc, PDF_COLORS.border, 'draw');
    doc.line(marginLeft, y, marginLeft + contentWidth, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    setColor(doc, PDF_COLORS.text);

    dossier.documents.forEach((docItem, idx) => {
      y = checkPageBreak(doc, y, 8);

      doc.text(`D${idx + 1}`, colX.num, y);

      const nameLines = doc.splitTextToSize(docItem.original_filename || docItem.filename, 80);
      doc.text(nameLines[0], colX.name, y);

      doc.text(docItem.document_type || 'PDF', colX.type, y);
      doc.text(docItem.page_count?.toString() || '-', colX.pages, y);

      y += 6;
    });

    y += 5;
  }

  // ============================================
  // SECTION 7: INCIDENTS LIÉS
  // ============================================

  if (includeIncidents && dossier.incidents && dossier.incidents.length > 0) {
    y = checkPageBreak(doc, y, 60);
    y = drawSectionTitle(doc, 'INCIDENTS LIÉS', y, { numbered: true, number: 7, color: PDF_COLORS.critique });

    for (const incident of dossier.incidents) {
      y = checkPageBreak(doc, y, 20);

      const severityColor = getSeverityColor(incident.gravite);

      // Card background
      setColor(doc, PDF_COLORS.background, 'fill');
      doc.roundedRect(marginLeft, y - 3, contentWidth, 18, 2, 2, 'F');

      // Severity bar
      setColor(doc, severityColor, 'fill');
      doc.rect(marginLeft, y - 3, 3, 18, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      setColor(doc, PDF_COLORS.text);
      doc.text(`INC-${String(incident.numero).padStart(4, '0')}: ${incident.titre}`, marginLeft + 8, y + 2);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      setColor(doc, PDF_COLORS.muted);
      doc.text(`${incident.gravite} | ${incident.statut} | ${formatPDFDate(incident.date_incident)}`, marginLeft + 8, y + 9);

      y += 22;
    }
  }

  // ============================================
  // SECTION 8: RECOMMANDATIONS
  // ============================================

  if (folder.recommendations && folder.recommendations.length > 0) {
    y = checkPageBreak(doc, y, 60);
    y = drawSectionTitle(doc, 'RECOMMANDATIONS', y, { numbered: true, number: 8, color: PDF_COLORS.faible });

    folder.recommendations.forEach((rec, idx) => {
      y = checkPageBreak(doc, y, 15);

      // Priority badge
      const priorityColor = rec.priority === 'haute' ? PDF_COLORS.critique :
        rec.priority === 'moyenne' ? PDF_COLORS.moyenne : PDF_COLORS.faible;

      setColor(doc, priorityColor, 'fill');
      doc.circle(marginLeft + 3, y, 2, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      setColor(doc, PDF_COLORS.text);

      const actionLines = doc.splitTextToSize(rec.action, contentWidth - 15);
      doc.text(actionLines, marginLeft + 8, y + 1);

      if (rec.deadline) {
        doc.setFontSize(7);
        setColor(doc, PDF_COLORS.muted);
        doc.text(`Échéance: ${formatPDFDate(rec.deadline)}`, marginLeft + 8, y + actionLines.length * 4 + 3);
        y += 3;
      }

      y += actionLines.length * 4 + 8;
    });
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

  const disclaimer = 'Ce dossier est établi conformément à la Loi fédérale sur la protection des données (LPD) ' +
    'et aux dispositions du Code civil suisse relatives à la protection de l\'adulte. ' +
    'Son contenu est strictement confidentiel.';

  const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth - 10);
  doc.text(disclaimerLines, marginLeft + 5, y + 6);

  // ============================================
  // PIEDS DE PAGE
  // ============================================

  addFootersToAllPages(doc, 'incident', folder.name);

  // Sauvegarde
  const safeName = folder.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  doc.save(`dossier-${safeName}-${new Date().toISOString().split('T')[0]}.pdf`);
}

export default generateDossierPDF;
