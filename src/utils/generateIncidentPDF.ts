/**
 * Generate Incident PDF - Style Fiche Technique/Factuel
 * Export ultra premium pour incidents individuels avec emails et recherche juridique
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
  drawEmailBlock,
  drawEmailCitation,
  drawLegalSearchResult,
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
import { supabase } from '@/integrations/supabase/client';

interface EmailData {
  id: string;
  sender: string;
  recipient?: string;
  subject: string;
  body: string;
  received_at: string;
  is_sent?: boolean;
}

interface LegalSearchResult {
  title: string;
  reference_number: string;
  summary: string;
  source_url: string;
  source_name: string;
  source_type: 'jurisprudence' | 'legislation';
  date_decision?: string;
  relevance_score?: number;
}

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
  includeEmails?: boolean;
  includeEmailCitations?: boolean;
  includeLegalSearch?: boolean;
  emails?: EmailData[];
}

interface ExtractedCitation {
  text: string;
  emailIndex: number;
  emailDate: string;
  emailSender: string;
  relevance: string;
}

/**
 * Extrait les citations probantes des emails via AI
 */
async function extractEmailCitations(
  emails: EmailData[],
  faits: string,
  dysfonctionnement: string
): Promise<ExtractedCitation[]> {
  if (!emails || emails.length === 0) return [];

  try {
    const { data, error } = await supabase.functions.invoke('analyze-incident', {
      body: {
        text: `Contexte de l'incident:
Faits: ${faits}
Dysfonctionnement: ${dysfonctionnement}

Emails à analyser:
${emails.map((e, i) => `[Email ${i + 1}] De: ${e.sender} | Date: ${e.received_at}
${e.body}`).join('\n\n---\n\n')}

Extrais les citations les plus pertinentes (phrases exactes) qui prouvent les faits et le dysfonctionnement. Maximum 8 citations.`
      }
    });

    if (error || !data) return [];

    // Parser la réponse pour extraire les citations
    const citations: ExtractedCitation[] = [];
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Extraire manuellement les passages clés
    for (let i = 0; i < emails.length && citations.length < 8; i++) {
      const email = emails[i];
      const sentences = email.body.split(/[.!?]+/).filter(s => s.trim().length > 20);
      
      for (const sentence of sentences.slice(0, 2)) {
        if (citations.length >= 8) break;
        
        const lowerSentence = sentence.toLowerCase();
        const isRelevant = 
          lowerSentence.includes('délai') ||
          lowerSentence.includes('attente') ||
          lowerSentence.includes('réponse') ||
          lowerSentence.includes('urgent') ||
          lowerSentence.includes('problème') ||
          lowerSentence.includes('manque') ||
          lowerSentence.includes('refus') ||
          faits.toLowerCase().split(' ').some(word => word.length > 4 && lowerSentence.includes(word));
        
        if (isRelevant) {
          citations.push({
            text: sentence.trim().substring(0, 200),
            emailIndex: i + 1,
            emailDate: formatPDFDate(email.received_at),
            emailSender: email.sender,
            relevance: 'Prouve les faits allégués'
          });
        }
      }
    }

    return citations;
  } catch (e) {
    console.error('Error extracting citations:', e);
    return [];
  }
}

/**
 * Recherche juridique automatique pour l'incident
 */
async function searchLegalContext(
  incidentType: string,
  faits: string,
  dysfonctionnement: string,
  institution: string
): Promise<{ jurisprudence: LegalSearchResult[]; legislation: LegalSearchResult[] }> {
  try {
    const { data, error } = await supabase.functions.invoke('search-incident-legal-context', {
      body: {
        incidentType,
        faits,
        dysfonctionnement,
        institution
      }
    });

    if (error || !data?.success) {
      console.error('Legal search error:', error || data?.error);
      return { jurisprudence: [], legislation: [] };
    }

    return {
      jurisprudence: data.results?.jurisprudence || [],
      legislation: data.results?.legislation || []
    };
  } catch (e) {
    console.error('Error in legal search:', e);
    return { jurisprudence: [], legislation: [] };
  }
}

/**
 * Génère un PDF ultra premium pour un incident avec tous les enrichissements
 */
export async function generateIncidentPDF(
  incident: IncidentData,
  options: GenerateIncidentPDFOptions = {}
): Promise<void> {
  const {
    includeProofs = true,
    includeLegalExplanations = true,
    includeEmails = false,
    includeEmailCitations = false,
    includeLegalSearch = false,
    emails = [],
  } = options;

  const doc = new jsPDF();
  const { marginLeft, contentWidth } = PDF_DIMENSIONS;

  let sectionNumber = 1;

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
  
  y = drawSectionTitle(doc, 'IDENTIFICATION', y, { numbered: true, number: sectionNumber++ });

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
  y = drawSectionTitle(doc, 'EXPOSÉ DES FAITS', y, { numbered: true, number: sectionNumber++ });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setColor(doc, PDF_COLORS.text);
  
  const faitsText = incident.faits || 'Aucun fait renseigné.';
  const faitsLines = doc.splitTextToSize(faitsText, contentWidth - 10);
  
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
  y = drawSectionTitle(doc, 'DYSFONCTIONNEMENT IDENTIFIÉ', y, { numbered: true, number: sectionNumber++ });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setColor(doc, PDF_COLORS.text);
  
  const dysfText = incident.dysfonctionnement || 'Aucun dysfonctionnement renseigné.';
  const dysfLines = doc.splitTextToSize(dysfText, contentWidth - 10);
  
  const dysfHeight = dysfLines.length * 5 + 10;
  y = checkPageBreak(doc, y, dysfHeight);
  
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
    y = drawSectionTitle(doc, 'BASES LÉGALES APPLICABLES', y, { numbered: true, number: sectionNumber++, color: PDF_COLORS.legal });

    const allText = `${incident.faits} ${incident.dysfonctionnement}`;
    let legalRefs = extractLegalReferences(allText);
    
    if (legalRefs.length === 0) {
      legalRefs = getDefaultLegalBasesForType(incident.type);
    }

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
    y = drawSectionTitle(doc, 'PREUVES RÉFÉRENCÉES', y, { numbered: true, number: sectionNumber++, color: PDF_COLORS.evidence });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.secondary);
    
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
  // SECTION 6: HISTORIQUE EMAIL COMPLET
  // ============================================
  
  if (includeEmails && emails.length > 0) {
    y = checkPageBreak(doc, y, 60);
    y = drawSectionTitle(doc, 'HISTORIQUE EMAIL COMPLET', y, { numbered: true, number: sectionNumber++, color: PDF_COLORS.primary });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    setColor(doc, PDF_COLORS.muted);
    doc.text(`${emails.length} email(s) lié(s) à cet incident`, marginLeft, y);
    y += 8;

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      y = drawEmailBlock(doc, y, {
        sender: email.sender,
        recipient: email.recipient,
        date: formatPDFDateTime(email.received_at),
        subject: email.subject,
        body: email.body,
        isReceived: !email.is_sent,
        citationNumber: i + 1
      });
    }
  }

  // ============================================
  // SECTION 7: CITATIONS PROBANTES
  // ============================================
  
  if (includeEmailCitations && emails.length > 0) {
    y = checkPageBreak(doc, y, 60);
    y = drawSectionTitle(doc, 'CITATIONS PROBANTES', y, { numbered: true, number: sectionNumber++, color: PDF_COLORS.evidence });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    setColor(doc, PDF_COLORS.muted);
    doc.text('Passages clés extraits des emails prouvant les faits allégués', marginLeft, y);
    y += 8;

    const citations = await extractEmailCitations(emails, incident.faits, incident.dysfonctionnement);
    
    if (citations.length > 0) {
      for (let i = 0; i < citations.length; i++) {
        const citation = citations[i];
        y = drawEmailCitation(doc, y, {
          number: i + 1,
          text: citation.text,
          emailDate: citation.emailDate,
          emailSender: citation.emailSender,
          relevance: citation.relevance
        });
      }
    } else {
      doc.setFont('helvetica', 'normal');
      setColor(doc, PDF_COLORS.text);
      doc.text('Aucune citation probante extraite automatiquement.', marginLeft, y);
      y += 10;
    }
  }

  // ============================================
  // SECTION 8: RECHERCHE JURIDIQUE EN LIGNE
  // ============================================
  
  if (includeLegalSearch) {
    y = checkPageBreak(doc, y, 80);
    y = drawSectionTitle(doc, 'RECHERCHE JURIDIQUE EN LIGNE', y, { numbered: true, number: sectionNumber++, color: PDF_COLORS.legal });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    setColor(doc, PDF_COLORS.muted);
    doc.text('Jurisprudence et législation trouvées automatiquement', marginLeft, y);
    y += 8;

    const legalResults = await searchLegalContext(
      incident.type,
      incident.faits,
      incident.dysfonctionnement,
      incident.institution
    );

    // Jurisprudence
    if (legalResults.jurisprudence.length > 0) {
      y = checkPageBreak(doc, y, 40);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      setColor(doc, PDF_COLORS.legal);
      doc.text('Jurisprudence pertinente', marginLeft, y);
      y += 8;

      for (const result of legalResults.jurisprudence) {
        y = drawLegalSearchResult(doc, y, result);
      }
    }

    // Législation
    if (legalResults.legislation.length > 0) {
      y = checkPageBreak(doc, y, 40);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      setColor(doc, PDF_COLORS.evidence);
      doc.text('Législation applicable', marginLeft, y);
      y += 8;

      for (const result of legalResults.legislation) {
        y = drawLegalSearchResult(doc, y, result);
      }
    }

    if (legalResults.jurisprudence.length === 0 && legalResults.legislation.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      setColor(doc, PDF_COLORS.muted);
      doc.text('Aucun résultat de recherche juridique disponible.', marginLeft, y);
      y += 10;
    }
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

  // Nom du fichier selon les options
  let filename = `fiche-incident-${incident.numero}`;
  if (includeEmails) filename += '-emails';
  if (includeLegalSearch) filename += '-juridique';
  
  doc.save(`${filename}.pdf`);
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
