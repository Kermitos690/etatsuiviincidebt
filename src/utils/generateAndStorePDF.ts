/**
 * Génération et stockage automatique des PDFs d'incident
 * Sauvegarde dans Supabase Storage + table incident_exports
 */

import { supabase } from '@/integrations/supabase/client';
import { generateIncidentPDF } from './generateIncidentPDF';
import { Incident } from '@/types/incident';

interface GenerateOptions {
  includeProofs?: boolean;
  includeLegalExplanations?: boolean;
  includeEmails?: boolean;
  includeEmailCitations?: boolean;
  includeLegalSearch?: boolean;
  includeDeepAnalysis?: boolean;
  emails?: any[];
}

/**
 * Génère les initiales d'une institution
 * Ex: "Service de Protection Civile" -> "SPC"
 */
function getInstitutionInitials(institution: string): string {
  if (!institution) return 'INC';
  
  // Cas spéciaux connus
  const specialCases: Record<string, string> = {
    'justice de paix': 'JP',
    'juge de paix': 'JP',
    'service de curatelle': 'SC',
    'curatelle': 'CUR',
    'apea': 'APEA',
    'kesb': 'KESB',
    'tribunal': 'TRIB',
    'police': 'POL',
    'assurance': 'ASS',
    'banque': 'BQ',
    'commune': 'COM',
    'canton': 'CT',
    'etat': 'ET',
  };

  const lowerInst = institution.toLowerCase();
  for (const [key, initials] of Object.entries(specialCases)) {
    if (lowerInst.includes(key)) return initials;
  }

  // Générer initiales à partir des mots principaux
  const words = institution
    .split(/[\s\-_]+/)
    .filter(w => w.length > 2 && !['de', 'du', 'des', 'la', 'le', 'les', 'et'].includes(w.toLowerCase()));
  
  if (words.length === 0) return 'INC';
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  
  return words
    .slice(0, 4)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

/**
 * Génère le nom de fichier avancé
 * Format: {DATE}_{PRIORITE}_{INITIALES}_{NUMERO}.pdf
 */
export function generateAdvancedFilename(incident: Incident, isPdfPlus: boolean = false): string {
  const date = incident.dateIncident 
    ? new Date(incident.dateIncident).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  
  const priorityMap: Record<string, string> = {
    critique: 'CRIT',
    eleve: 'ELEV',
    moyen: 'MOY',
    faible: 'FAIB',
  };
  const priority = priorityMap[incident.priorite] || 'MOY';
  
  const initials = getInstitutionInitials(incident.institution);
  const numero = String(incident.numero).padStart(4, '0');
  const suffix = isPdfPlus ? '_PLUS' : '';
  
  return `${date}_${priority}_${initials}_${numero}${suffix}.pdf`;
}

/**
 * Génère un PDF, le stocke dans Supabase Storage et l'enregistre dans incident_exports
 * Retourne aussi le blob pour téléchargement local
 */
export async function generateAndStoreIncidentPDF(
  incident: Incident,
  options: GenerateOptions = {},
  isPdfPlus: boolean = false
): Promise<{ blob: Blob; fileName: string; storagePath: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Utilisateur non authentifié');

  // Générer le PDF (la fonction existante retourne void et download directement)
  // On doit modifier pour obtenir le blob
  const pdfBlob = await generateIncidentPDFBlob(incident, options);
  
  const fileName = generateAdvancedFilename(incident, isPdfPlus);
  const storagePath = `${user.id}/${incident.id}/${fileName}`;

  // Upload vers Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('incident-exports')
    .upload(storagePath, pdfBlob, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw new Error('Erreur lors du stockage du PDF');
  }

  // Enregistrer dans incident_exports
  const { error: insertError } = await supabase
    .from('incident_exports')
    .insert({
      incident_id: incident.id,
      user_id: user.id,
      file_name: fileName,
      storage_path: storagePath,
      file_size_bytes: pdfBlob.size,
      export_options: options as Record<string, boolean>,
      version: 1,
    });

  if (insertError) {
    console.error('Insert error:', insertError);
    // Ne pas throw, le PDF est quand même stocké
  }

  return { blob: pdfBlob, fileName, storagePath };
}

/**
 * Version modifiée de generateIncidentPDF qui retourne un Blob
 */
async function generateIncidentPDFBlob(
  incident: Incident,
  options: GenerateOptions
): Promise<Blob> {
  // Import dynamique de jsPDF pour réduire bundle
  const { default: jsPDF } = await import('jspdf');
  const { 
    PDF_COLORS, 
    PDF_DIMENSIONS,
    setColor,
    getSeverityColor,
    drawPremiumHeader,
    drawPremiumFooter,
    drawSectionTitle,
    normalizeTextForPdf,
    drawJustifiedTextBlock,
  } = await import('./pdfStyles');
  const { format } = await import('date-fns');
  const { fr } = await import('date-fns/locale');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { marginLeft, contentWidth, safeContentWidth, pageWidth, marginRight, maxContentY } = PDF_DIMENSIONS;
  let y = 15;
  let pageNumber = 1;

  // Helper pour vérifier saut de page
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > maxContentY) {
      drawPremiumFooter(doc, 'incident', pageNumber, 1, format(new Date(), 'dd/MM/yyyy'));
      doc.addPage();
      pageNumber++;
      y = 20;
    }
  };

  // En-tête
  y = drawPremiumHeader(doc, 'incident', incident.titre, incident.numero);

  // Métadonnées
  checkPageBreak(40);
  y += 5;
  
  const infoData = [
    { label: 'Date incident', value: format(new Date(incident.dateIncident), 'd MMMM yyyy', { locale: fr }) },
    { label: 'Institution', value: incident.institution },
    { label: 'Type', value: incident.type },
    { label: 'Gravité', value: incident.gravite },
    { label: 'Priorité', value: incident.priorite.toUpperCase() },
    { label: 'Statut', value: incident.statut },
  ];

  doc.setFontSize(10);
  for (const item of infoData) {
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.secondary);
    doc.text(`${item.label}:`, marginLeft, y);
    
    doc.setFont('helvetica', 'normal');
    setColor(doc, PDF_COLORS.text);
    doc.text(item.value || 'N/A', marginLeft + 35, y);
    y += 6;
  }

  y += 10;

  // Section FAITS
  checkPageBreak(30);
  y = drawSectionTitle(doc, 'EXPOSE DES FAITS', y, { numbered: true, number: 1 });
  
  const faitsText = normalizeTextForPdf(incident.faits || 'Non renseigné', { maxLength: 3000 });
  y = drawJustifiedTextBlock(doc, faitsText, y);
  y += 10;

  // Section DYSFONCTIONNEMENT
  checkPageBreak(30);
  y = drawSectionTitle(doc, 'DYSFONCTIONNEMENT IDENTIFIE', y, { numbered: true, number: 2 });
  
  const dysfText = normalizeTextForPdf(incident.dysfonctionnement || 'Non renseigné', { maxLength: 3000 });
  y = drawJustifiedTextBlock(doc, dysfText, y);
  y += 10;

  // Preuves si demandées
  if (options.includeProofs && incident.preuves && incident.preuves.length > 0) {
    checkPageBreak(20 + incident.preuves.length * 8);
    y = drawSectionTitle(doc, 'PIECES JUSTIFICATIVES', y, { numbered: true, number: 3 });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    setColor(doc, PDF_COLORS.text);
    
    incident.preuves.forEach((preuve, idx) => {
      checkPageBreak(8);
      doc.text(`${idx + 1}. ${preuve.label} (${preuve.type})`, marginLeft + 5, y);
      y += 6;
    });
    y += 5;
  }

  // Transmission JP
  if (incident.transmisJP) {
    checkPageBreak(15);
    y += 5;
    setColor(doc, PDF_COLORS.legal, 'fill');
    doc.roundedRect(marginLeft, y - 4, contentWidth, 12, 2, 2, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.white);
    const transmisText = `Transmis au Juge de Paix le ${incident.dateTransmissionJP ? format(new Date(incident.dateTransmissionJP), 'd MMMM yyyy', { locale: fr }) : 'N/A'}`;
    doc.text(transmisText, marginLeft + 5, y + 3);
    y += 15;
  }

  // Footer
  drawPremiumFooter(doc, 'incident', pageNumber, pageNumber, format(new Date(), 'dd/MM/yyyy HH:mm'));

  // Retourner le blob
  return doc.output('blob');
}
