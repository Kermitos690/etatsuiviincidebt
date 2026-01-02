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
  normalizeTextForPdf,
  drawJustifiedText,
  drawJustifiedTextBlock,
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
    filename?: string;
    ai_analysis?: any;
    size_bytes?: number;
    mime_type?: string;
  }>;
  gmailReferences?: any;
  confidenceLevel?: string;
  email_source_id?: string;
}

interface AttachmentData {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  email_id: string;
  email_sender?: string;
  email_received_at?: string;
  ai_analysis?: {
    extracted_text?: string;
    legal_analysis?: string;
    severity?: string;
    violations?: string[];
    summary?: string;
  };
}

interface GenerateIncidentPDFOptions {
  includeProofs?: boolean;
  includeLegalExplanations?: boolean;
  includeEmails?: boolean;
  includeEmailCitations?: boolean;
  includeLegalSearch?: boolean;
  includeDeepAnalysis?: boolean;
  includeAttachments?: boolean;
  emails?: EmailData[];
  attachments?: AttachmentData[];
}

// Deep Analysis Types
interface CausalLink {
  cause: string;
  citation: string;
  consequence: string;
  impact: string;
  date?: string;
}

interface ExcuseAnalysis {
  actor: string;
  excuse: string;
  citation: string;
  legal_obligation: string;
  legal_article: string;
  is_valid: boolean;
  counter_argument: string;
}

interface BehavioralContradiction {
  actor: string;
  action_1: string;
  action_1_date?: string;
  action_2: string;
  action_2_date?: string;
  contradiction: string;
  severity: 'minor' | 'moderate' | 'major';
}

interface DeadlineAnalysis {
  event: string;
  event_date?: string;
  discovery_date?: string;
  deadline_date?: string;
  legal_deadline_days?: number;
  remaining_days?: number;
  impact: string;
  citation: string;
  legal_basis: string;
}

interface CascadeFailure {
  step: number;
  failure: string;
  date?: string;
  leads_to: string;
  responsibility: string;
}

interface ResponsibilityAssessment {
  actor: string;
  role: string;
  failures: string[];
  legal_violations: string[];
  mitigating_factors: string[];
  severity_score: number;
}

interface DeepAnalysisResult {
  causal_chain: CausalLink[];
  excuses_detected: ExcuseAnalysis[];
  behavioral_contradictions: BehavioralContradiction[];
  deadline_analysis: DeadlineAnalysis[];
  cascade_failures: CascadeFailure[];
  responsibilities: ResponsibilityAssessment[];
  synthesis: {
    main_dysfunction: string;
    root_cause: string;
    aggravating_factors: string[];
    rights_violated: string[];
    recommended_actions: string[];
    severity_assessment: string;
  };
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

  const citations: ExtractedCitation[] = [];
  
  // Patterns for automatic extraction (same as HighlightedEmailBody)
  const extractionPatterns = {
    violation: [
      /\brefus[^\.]*\./gi,
      /\bimpossible[^\.]*\./gi,
      /\bn'a pas[^\.]*\./gi,
      /\bne peut pas[^\.]*\./gi,
      /\bpas reçu[^\.]*\./gi,
      /\bsans réponse[^\.]*\./gi,
    ],
    deadline: [
      /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b[^\.]*\./gi,
      /\bdélai[^\.]*\./gi,
      /\bavant le\s+[^\.]+\./gi,
      /\bjusqu'au\s+[^\.]+\./gi,
      /\bau plus tard[^\.]*\./gi,
      /\bdepuis le\s+[^\.]+\./gi,
      /\bça fait\s+\d+[^\.]*\./gi,
    ],
    commitment: [
      /\bje m'engage[^\.]*\./gi,
      /\bnous nous engageons[^\.]*\./gi,
      /\bje vous confirme[^\.]*\./gi,
      /\bje vous assure[^\.]*\./gi,
      /\bje ferai[^\.]*\./gi,
      /\bnous ferons[^\.]*\./gi,
      /\bsera fait[^\.]*\./gi,
    ],
    threat: [
      /\bà défaut[^\.]*\./gi,
      /\bsinon[^\.]*\./gi,
      /\bsous peine[^\.]*\./gi,
      /\bfaute de quoi[^\.]*\./gi,
      /\bje me verrai[^\.]*\./gi,
      /\bnous nous réservons[^\.]*\./gi,
      /\bcontraint de[^\.]*\./gi,
    ],
    evidence: [
      /\bcomme vous l'avez[^\.]*\./gi,
      /\bvous avez dit[^\.]*\./gi,
      /\bselon votre[^\.]*\./gi,
      /\bdans votre courrier[^\.]*\./gi,
      /\bvotre email du[^\.]*\./gi,
      /\bprécédemment[^\.]*\./gi,
    ]
  };

  const relevanceLabels: Record<string, string> = {
    violation: 'Violation identifiée',
    deadline: 'Délai mentionné',
    commitment: 'Engagement pris',
    threat: 'Avertissement/Menace',
    evidence: 'Référence probante'
  };

  // Extract from each email
  for (let i = 0; i < emails.length && citations.length < 12; i++) {
    const email = emails[i];
    const body = email.body;

    // Apply patterns
    for (const [type, patterns] of Object.entries(extractionPatterns)) {
      for (const pattern of patterns) {
        let match;
        // Reset regex
        pattern.lastIndex = 0;
        while ((match = pattern.exec(body)) !== null && citations.length < 12) {
          const text = match[0].trim();
          // Avoid duplicates
          if (text.length > 15 && !citations.some(c => c.text === text)) {
            citations.push({
              text: text.substring(0, 250),
              emailIndex: i + 1,
              emailDate: formatPDFDate(email.received_at),
              emailSender: email.sender,
              relevance: relevanceLabels[type] || 'Citation pertinente'
            });
          }
        }
      }
    }

    // Also extract sentences containing keywords from faits/dysfonctionnement
    const keywords = [...faits.split(/\s+/), ...dysfonctionnement.split(/\s+/)]
      .filter(w => w.length > 5)
      .map(w => w.toLowerCase().replace(/[^\wàâäéèêëïîôùûü]/g, ''));

    const sentences = body.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    for (const sentence of sentences) {
      if (citations.length >= 12) break;
      
      const sentenceLower = sentence.toLowerCase();
      const matchedKeywords = keywords.filter(kw => sentenceLower.includes(kw));
      
      if (matchedKeywords.length >= 2 && !citations.some(c => c.text.includes(sentence.trim().substring(0, 50)))) {
        citations.push({
          text: sentence.trim().substring(0, 250),
          emailIndex: i + 1,
          emailDate: formatPDFDate(email.received_at),
          emailSender: email.sender,
          relevance: 'Contexte factuel'
        });
      }
    }
  }

  return citations;
}

/**
 * Effectue une analyse approfondie de l'incident via IA
 */
async function performDeepAnalysis(
  emails: EmailData[],
  faits: string,
  dysfonctionnement: string,
  incidentType: string,
  institution: string
): Promise<DeepAnalysisResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('deep-incident-analysis', {
      body: { emails, faits, dysfonctionnement, incidentType, institution }
    });

    if (error || !data?.success) {
      console.error('Deep analysis error:', error || data?.error);
      return null;
    }

    return data.analysis as DeepAnalysisResult;
  } catch (e) {
    console.error('Error in deep analysis:', e);
    return null;
  }
}

/**
 * Dessine la section d'analyse approfondie dans le PDF
 */
function drawDeepAnalysisSection(
  doc: jsPDF,
  y: number,
  analysis: DeepAnalysisResult,
  sectionNumber: number
): { y: number; nextSection: number } {
  const { marginLeft, contentWidth, safeContentWidth, textInnerMargin } = PDF_DIMENSIONS;
  let currentSection = sectionNumber;

  // Largeur sûre pour le texte
  const textWidth = safeContentWidth - textInnerMargin;

  // ============================================
  // SECTION: ANALYSE CONTEXTUELLE APPROFONDIE
  // ============================================
  
  y = checkPageBreak(doc, y, 80);
  y = drawSectionTitle(doc, 'ANALYSE CONTEXTUELLE APPROFONDIE', y, { 
    numbered: true, 
    number: currentSection++, 
    color: PDF_COLORS.critique 
  });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  setColor(doc, PDF_COLORS.muted);
  doc.text('Analyse narrative et rhetorique par intelligence artificielle', marginLeft, y);
  y += 10;

  // A. CHAÎNE DE CAUSALITÉ
  if (analysis.causal_chain && analysis.causal_chain.length > 0) {
    y = checkPageBreak(doc, y, 50);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.primary);
    doc.text('A. CHAINE DE CAUSALITE', marginLeft, y);
    y += 8;

    for (const link of analysis.causal_chain) {
      // Normalize all text from AI analysis
      const cause = normalizeTextForPdf(link.cause || '', { maxLength: 150 });
      const citation = normalizeTextForPdf(link.citation || '', { maxLength: 200 });
      const consequence = normalizeTextForPdf(link.consequence || '', { maxLength: 100 });
      const impact = normalizeTextForPdf(link.impact || '', { maxLength: 100 });
      
      // Calculate dynamic height based on citation length
      doc.setFontSize(8);
      const citationLines = doc.splitTextToSize(`"${citation}"`, textWidth);
      const displayedCitationLines = citationLines.slice(0, 3);
      const dynamicHeight = 18 + (displayedCitationLines.length * 4);
      
      y = checkPageBreak(doc, y, dynamicHeight + 5);
      
      // Cause box with dynamic height
      setColor(doc, PDF_COLORS.background, 'fill');
      doc.roundedRect(marginLeft, y - 2, contentWidth, dynamicHeight, 2, 2, 'F');
      
      const textX = marginLeft + textInnerMargin;
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      setColor(doc, PDF_COLORS.critique);
      doc.text(`CAUSE: ${cause}`, textX, y + 4);
      
      doc.setFont('helvetica', 'normal');
      setColor(doc, PDF_COLORS.text);
      doc.text(displayedCitationLines, textX, y + 10);
      
      const bottomY = y + 10 + (displayedCitationLines.length * 4);
      doc.setFontSize(7);
      setColor(doc, PDF_COLORS.muted);
       doc.text(`=> ${consequence}`, textX, bottomY);
       doc.text(`Impact: ${impact}`, marginLeft + contentWidth/2, bottomY);
      
      y += dynamicHeight + 4;
    }
    y += 5;
  }

  // B. EXCUSES VS OBLIGATIONS LÉGALES
  if (analysis.excuses_detected && analysis.excuses_detected.length > 0) {
    y = checkPageBreak(doc, y, 50);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.legal);
    doc.text('B. EXCUSES VS OBLIGATIONS LÉGALES', marginLeft, y);
    y += 8;

    for (const excuse of analysis.excuses_detected) {
      // Normalize all text
      const actor = normalizeTextForPdf(excuse.actor || '', { maxLength: 50 });
      const excuseText = normalizeTextForPdf(excuse.excuse || '', { maxLength: 100 });
      const citation = normalizeTextForPdf(excuse.citation || '', { maxLength: 200 });
      const legalObligation = normalizeTextForPdf(excuse.legal_obligation || '', { maxLength: 150 });
      const counterArg = normalizeTextForPdf(excuse.counter_argument || '', { maxLength: 200 });
      
      y = checkPageBreak(doc, y, 40);
      
      const isValid = excuse.is_valid;
      const statusColor = isValid ? PDF_COLORS.faible : PDF_COLORS.critique;
      
      setColor(doc, PDF_COLORS.background, 'fill');
      doc.roundedRect(marginLeft, y - 2, contentWidth, 34, 2, 2, 'F');
      
      // Status indicator
      setColor(doc, statusColor, 'fill');
      doc.rect(marginLeft, y - 2, 4, 34, 'F');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      setColor(doc, PDF_COLORS.text);
      doc.text(`${actor} - Excuse: "${excuseText}"`, marginLeft + 8, y + 4);
      
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      setColor(doc, PDF_COLORS.muted);
      const excuseCitation = doc.splitTextToSize(`Citation: "${citation}"`, contentWidth - 15);
      doc.text(excuseCitation.slice(0, 2), marginLeft + 8, y + 10);
      
      doc.setFont('helvetica', 'normal');
      setColor(doc, PDF_COLORS.legal);
      doc.text(`Obligation: ${legalObligation} (${excuse.legal_article || 'N/A'})`, marginLeft + 8, y + 20);
      
      doc.setFont('helvetica', 'bold');
      setColor(doc, statusColor);
       const verdict = isValid ? 'VALABLE' : 'NON VALABLE';
       doc.text(verdict, marginLeft + 8, y + 26);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      setColor(doc, PDF_COLORS.text);
      const counterLines = doc.splitTextToSize(counterArg, contentWidth - 50);
      doc.text(counterLines[0] || '', marginLeft + 40, y + 26);
      
      y += 38;
    }
    y += 5;
  }

  // C. CONTRADICTIONS COMPORTEMENTALES
  if (analysis.behavioral_contradictions && analysis.behavioral_contradictions.length > 0) {
    y = checkPageBreak(doc, y, 50);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.haute);
    doc.text('C. CONTRADICTIONS COMPORTEMENTALES', marginLeft, y);
    y += 8;

    for (const contradiction of analysis.behavioral_contradictions) {
      // Normalize text
      const actor = normalizeTextForPdf(contradiction.actor || '', { maxLength: 50 });
      const action1 = normalizeTextForPdf(contradiction.action_1 || '', { maxLength: 150 });
      const action2 = normalizeTextForPdf(contradiction.action_2 || '', { maxLength: 150 });
      const contradictionText = normalizeTextForPdf(contradiction.contradiction || '', { maxLength: 150 });
      
      y = checkPageBreak(doc, y, 30);
      
      const severityColors = {
        minor: PDF_COLORS.muted,
        moderate: PDF_COLORS.haute,
        major: PDF_COLORS.critique
      };
      
      setColor(doc, PDF_COLORS.background, 'fill');
      doc.roundedRect(marginLeft, y - 2, contentWidth, 24, 2, 2, 'F');
      setColor(doc, severityColors[contradiction.severity] || PDF_COLORS.muted, 'fill');
      doc.rect(marginLeft, y - 2, 4, 24, 'F');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      setColor(doc, PDF_COLORS.text);
      doc.text(`${actor}`, marginLeft + 8, y + 4);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`Action 1: ${action1}`, marginLeft + 8, y + 10);
      doc.text(`Action 2: ${action2}`, marginLeft + 8, y + 15);
      
      setColor(doc, severityColors[contradiction.severity] || PDF_COLORS.muted);
      doc.text(`[!] ${contradictionText}`, marginLeft + 8, y + 20);
      
      y += 28;
    }
    y += 5;
  }

  // D. DÉLAIS CRITIQUES
  if (analysis.deadline_analysis && analysis.deadline_analysis.length > 0) {
    y = checkPageBreak(doc, y, 50);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.critique);
    doc.text('D. DÉLAIS CRITIQUES', marginLeft, y);
    y += 8;

    for (const deadline of analysis.deadline_analysis) {
      // Normalize text
      const event = normalizeTextForPdf(deadline.event || '', { maxLength: 100 });
      const impact = normalizeTextForPdf(deadline.impact || '', { maxLength: 150 });
      const legalBasis = normalizeTextForPdf(deadline.legal_basis || '', { maxLength: 100 });
      
      y = checkPageBreak(doc, y, 35);
      
      const isUrgent = (deadline.remaining_days || 999) < 10;
      
      setColor(doc, PDF_COLORS.background, 'fill');
      doc.roundedRect(marginLeft, y - 2, contentWidth, 28, 2, 2, 'F');
      
      if (isUrgent) {
        setColor(doc, PDF_COLORS.critique, 'fill');
        doc.rect(marginLeft, y - 2, 4, 28, 'F');
      }
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      setColor(doc, PDF_COLORS.text);
      doc.text(event, marginLeft + 8, y + 4);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      
      const dates = [];
      if (deadline.event_date) dates.push(`Événement: ${deadline.event_date}`);
      if (deadline.discovery_date) dates.push(`Découverte: ${deadline.discovery_date}`);
      if (deadline.deadline_date) dates.push(`Échéance: ${deadline.deadline_date}`);
      doc.text(dates.join(' | '), marginLeft + 8, y + 10);
      
      if (deadline.remaining_days !== undefined) {
        setColor(doc, isUrgent ? PDF_COLORS.critique : PDF_COLORS.faible);
        doc.setFont('helvetica', 'bold');
        doc.text(`${deadline.remaining_days} jours restants`, marginLeft + 8, y + 16);
      }
      
      doc.setFont('helvetica', 'normal');
      setColor(doc, PDF_COLORS.muted);
      doc.text(`Base légale: ${legalBasis}`, marginLeft + 60, y + 16);
      
      setColor(doc, PDF_COLORS.text);
      const impactLines = doc.splitTextToSize(`Impact: ${impact}`, contentWidth - 15);
      doc.text(impactLines[0] || '', marginLeft + 8, y + 22);
      
      y += 32;
    }
    y += 5;
  }

  // E. DYSFONCTIONNEMENTS EN CASCADE
  if (analysis.cascade_failures && analysis.cascade_failures.length > 0) {
    y = checkPageBreak(doc, y, 50);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.critique);
    doc.text('E. DYSFONCTIONNEMENTS EN CASCADE', marginLeft, y);
    y += 8;

    for (const cascade of analysis.cascade_failures) {
      // Normalize text
      const failure = normalizeTextForPdf(cascade.failure || '', { maxLength: 150 });
      const leadsTo = normalizeTextForPdf(cascade.leads_to || '', { maxLength: 100 });
      const responsibility = normalizeTextForPdf(cascade.responsibility || '', { maxLength: 50 });
      
      y = checkPageBreak(doc, y, 20);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      setColor(doc, PDF_COLORS.critique);
      doc.text(`${cascade.step || '•'}.`, marginLeft, y);
      
      setColor(doc, PDF_COLORS.text);
      doc.text(failure, marginLeft + 8, y);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      setColor(doc, PDF_COLORS.muted);
      doc.text(`=> ${leadsTo}`, marginLeft + 15, y + 5);
      doc.text(`Responsable: ${responsibility}`, marginLeft + 100, y + 5);
      
      y += 12;
    }
    y += 5;
  }

  // F. RESPONSABILITÉS IDENTIFIÉES
  if (analysis.responsibilities && analysis.responsibilities.length > 0) {
    y = checkPageBreak(doc, y, 60);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.legal);
    doc.text('F. RESPONSABILITÉS IDENTIFIÉES', marginLeft, y);
    y += 8;

    for (const resp of analysis.responsibilities) {
      // Normalize text
      const actor = normalizeTextForPdf(resp.actor || '', { maxLength: 50 });
      const role = normalizeTextForPdf(resp.role || '', { maxLength: 30 });
      const failures = (resp.failures || []).map(f => normalizeTextForPdf(f, { maxLength: 50 }));
      const violations = (resp.legal_violations || []).map(v => normalizeTextForPdf(v, { maxLength: 50 }));
      const mitigating = (resp.mitigating_factors || []).map(m => normalizeTextForPdf(m, { maxLength: 50 }));
      
      y = checkPageBreak(doc, y, 40);
      
      const severityScore = resp.severity_score || 0;
      const severityPercent = severityScore * 10;
      
      setColor(doc, PDF_COLORS.background, 'fill');
      doc.roundedRect(marginLeft, y - 2, contentWidth, 32, 2, 2, 'F');
      
      // Severity bar
      setColor(doc, PDF_COLORS.border, 'fill');
      doc.rect(marginLeft + contentWidth - 45, y, 40, 4, 'F');
      setColor(doc, severityScore >= 7 ? PDF_COLORS.critique : severityScore >= 4 ? PDF_COLORS.haute : PDF_COLORS.faible, 'fill');
      doc.rect(marginLeft + contentWidth - 45, y, severityPercent * 0.4, 4, 'F');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      setColor(doc, PDF_COLORS.text);
      doc.text(`${actor} (${role})`, marginLeft + 5, y + 4);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      
      if (failures.length > 0) {
        doc.text(`Manquements: ${failures.join(', ')}`, marginLeft + 5, y + 12);
      }
      
      if (violations.length > 0) {
        setColor(doc, PDF_COLORS.legal);
        doc.text(`Violations: ${violations.join(', ')}`, marginLeft + 5, y + 18);
      }
      
      if (mitigating.length > 0) {
        setColor(doc, PDF_COLORS.muted);
        doc.text(`Facteurs atténuants: ${mitigating.join(', ')}`, marginLeft + 5, y + 24);
      }
      
      y += 36;
    }
    y += 5;
  }

  // G. SYNTHÈSE ET CONCLUSIONS
  if (analysis.synthesis) {
    // Normalize all synthesis text
    const mainDysfunction = normalizeTextForPdf(analysis.synthesis.main_dysfunction || '', { maxLength: 300 });
    const rootCause = normalizeTextForPdf(analysis.synthesis.root_cause || '', { maxLength: 200 });
    const severityAssessment = normalizeTextForPdf(analysis.synthesis.severity_assessment || '', { maxLength: 300 });
    const rightsViolated = (analysis.synthesis.rights_violated || []).map(r => normalizeTextForPdf(r, { maxLength: 50 }));
    const recommendedActions = (analysis.synthesis.recommended_actions || []).map(a => normalizeTextForPdf(a, { maxLength: 80 }));
    
    y = checkPageBreak(doc, y, 80);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.primary);
    doc.text('G. SYNTHÈSE ET CONCLUSIONS', marginLeft, y);
    y += 8;

    setColor(doc, PDF_COLORS.background, 'fill');
    const synthHeight = 60;
    doc.roundedRect(marginLeft, y - 2, contentWidth, synthHeight, 2, 2, 'F');
    setColor(doc, PDF_COLORS.primary, 'fill');
    doc.rect(marginLeft, y - 2, 4, synthHeight, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.text);
    doc.text('Dysfonctionnement principal:', marginLeft + 8, y + 5);
    doc.setFont('helvetica', 'normal');
    const mainDysfLines = doc.splitTextToSize(mainDysfunction, contentWidth - 20);
    doc.text(mainDysfLines.slice(0, 2), marginLeft + 8, y + 11);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Cause racine:', marginLeft + 8, y + 22);
    doc.setFont('helvetica', 'normal');
    const rootLines = doc.splitTextToSize(rootCause, contentWidth - 45);
    doc.text(rootLines[0] || '', marginLeft + 35, y + 22);
    
    if (rightsViolated.length > 0) {
      doc.setFont('helvetica', 'bold');
      setColor(doc, PDF_COLORS.critique);
      doc.text('Droits violés:', marginLeft + 8, y + 30);
      doc.setFont('helvetica', 'normal');
      doc.text(rightsViolated.join(', '), marginLeft + 35, y + 30);
    }
    
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.legal);
    doc.text('Évaluation:', marginLeft + 8, y + 40);
    doc.setFont('helvetica', 'normal');
    setColor(doc, PDF_COLORS.text);
    const sevLines = doc.splitTextToSize(severityAssessment, contentWidth - 35);
    doc.text(sevLines.slice(0, 2), marginLeft + 35, y + 40);
    
    if (recommendedActions.length > 0) {
      doc.setFont('helvetica', 'bold');
      setColor(doc, PDF_COLORS.faible);
      doc.text('Actions recommandées:', marginLeft + 8, y + 52);
      doc.setFont('helvetica', 'normal');
      doc.text(recommendedActions.slice(0, 2).join(' | '), marginLeft + 50, y + 52);
    }
    
    y += synthHeight + 8;
  }

  return { y, nextSection: currentSection };
}


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
): Promise<Blob> {
  const {
    includeProofs = true,
    includeLegalExplanations = true,
    includeEmails = false,
    includeEmailCitations = false,
    includeLegalSearch = false,
    includeDeepAnalysis = false,
    includeAttachments = false,
    emails = [],
    attachments = [],
  } = options;

  // Normalize incident text fields
  const normalizedTitre = normalizeTextForPdf(incident.titre || '', { maxLength: 200 });
  const normalizedFaits = normalizeTextForPdf(incident.faits || '', { maxLength: 5000 });
  const normalizedDysfonctionnement = normalizeTextForPdf(incident.dysfonctionnement || '', { maxLength: 3000 });
  const normalizedInstitution = normalizeTextForPdf(incident.institution || '', { maxLength: 100 });
  const normalizedType = normalizeTextForPdf(incident.type || '', { maxLength: 100 });

  // Perform deep analysis if requested
  let deepAnalysis: DeepAnalysisResult | null = null;
  if (includeDeepAnalysis && emails.length > 0) {
    deepAnalysis = await performDeepAnalysis(
      emails,
      incident.faits,
      incident.dysfonctionnement,
      incident.type,
      incident.institution
    );
  }

  const doc = new jsPDF();
  const { marginLeft, contentWidth } = PDF_DIMENSIONS;

  let sectionNumber = 1;

  // ============================================
  // PAGE 1: EN-TÊTE ET IDENTIFICATION
  // ============================================
  
  let y = drawPremiumHeader(
    doc, 
    'incident', 
    normalizedTitre,
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
    { label: 'Numero', value: `INC-${String(incident.numero).padStart(4, '0')}`, highlight: true },
    { label: 'Date incident', value: formatPDFDate(incident.dateIncident) },
    { label: 'Date creation', value: formatPDFDate(incident.dateCreation) },
    { label: 'Institution', value: normalizedInstitution },
    { label: 'Type', value: normalizedType },
    { label: 'Gravite', value: incident.gravite },
    { label: 'Priorite', value: `${incident.priorite} (Score: ${incident.score}/100)` },
    { label: 'Statut', value: incident.statut },
    { label: 'Transmis JP', value: incident.transmisJP 
      ? `Oui - ${incident.dateTransmissionJP ? formatPDFDate(incident.dateTransmissionJP) : 'Date non specifiee'}`
      : 'Non' 
    },
  ]);

  y += 5;

  // ============================================
  // SECTION 2: EXPOSE DES FAITS
  // ============================================
  
  y = checkPageBreak(doc, y, 60);
  y = drawSectionTitle(doc, 'EXPOSE DES FAITS', y, { numbered: true, number: sectionNumber++ });

  const faitsText = normalizedFaits || 'Aucun fait renseigne.';
  doc.setFontSize(10);
  
  // Utiliser le bloc justifié pour les faits
  y = drawJustifiedTextBlock(doc, faitsText, y, {
    backgroundColor: PDF_COLORS.background,
    textColor: PDF_COLORS.text,
    fontSize: 10,
    padding: 8
  });
  y += 5;

  // ============================================
  // SECTION 3: DYSFONCTIONNEMENT IDENTIFIE
  // ============================================
  
  y = checkPageBreak(doc, y, 60);
  y = drawSectionTitle(doc, 'DYSFONCTIONNEMENT IDENTIFIE', y, { numbered: true, number: sectionNumber++ });

  const dysfText = normalizedDysfonctionnement || 'Aucun dysfonctionnement renseigne.';
  doc.setFontSize(10);
  
  // Utiliser le bloc justifié avec bordure colorée pour le dysfonctionnement
  y = drawJustifiedTextBlock(doc, dysfText, y, {
    backgroundColor: PDF_COLORS.background,
    borderColor: severityColor,
    textColor: PDF_COLORS.text,
    fontSize: 10,
    padding: 8
  });
  y += 5;

  // ============================================
  // SECTION 4: BASES LEGALES APPLICABLES
  // ============================================
  
  if (includeLegalExplanations) {
    y = checkPageBreak(doc, y, 80);
    y = drawSectionTitle(doc, 'BASES LEGALES APPLICABLES', y, { numbered: true, number: sectionNumber++, color: PDF_COLORS.legal });

    const allText = `${normalizedFaits} ${normalizedDysfonctionnement}`;
    let legalRefs = extractLegalReferences(allText);
    
    if (legalRefs.length === 0) {
      legalRefs = getDefaultLegalBasesForType(incident.type);
    }

    let legalExplanations: LegalExplanation[] = [];
    try {
      legalExplanations = await fetchLegalExplanations(
        legalRefs,
        normalizedFaits,
        normalizedDysfonctionnement,
        normalizedType
      );
    } catch (e) {
      console.error('Failed to fetch legal explanations:', e);
    }

    if (legalExplanations.length > 0) {
      for (const legal of legalExplanations) {
        y = checkPageBreak(doc, y, 60);
        y = drawLegalBox(doc, y, {
          code: normalizeTextForPdf(legal.code || '', { maxLength: 50 }),
          article: normalizeTextForPdf(legal.article || '', { maxLength: 20 }),
          title: legal.title ? normalizeTextForPdf(legal.title, { maxLength: 100 }) : undefined,
          text: normalizeTextForPdf(legal.text || '', { maxLength: 1000 }),
          contextExplanation: legal.contextExplanation ? normalizeTextForPdf(legal.contextExplanation, { maxLength: 500 }) : undefined,
        });
      }
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      setColor(doc, PDF_COLORS.text);
      
      const defaultBases = [
        `- ${incident.type === 'Delai non respecte' ? 'Art. 406 CC - Accomplissement diligent des taches' : 'Art. 404 CC - Obligation du curateur'}`,
        '- Art. 29 Cst. - Garanties de procedure judiciaire et administrative',
        '- Art. 35 PA - Motivation des decisions',
        '- Art. 13 LPD - Obligation de confidentialite',
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
  // SECTION 5: PREUVES REFERENCEES
  // ============================================
  
  if (includeProofs && incident.preuves && incident.preuves.length > 0) {
    y = checkPageBreak(doc, y, 60);
    y = drawSectionTitle(doc, 'PREUVES REFERENCEES', y, { numbered: true, number: sectionNumber++, color: PDF_COLORS.evidence });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setColor(doc, PDF_COLORS.secondary);
    
    const colX = { num: marginLeft, type: marginLeft + 15, label: marginLeft + 40, hash: marginLeft + 120 };
    doc.text('No', colX.num, y);
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
      doc.text(normalizeTextForPdf(preuve.type || 'doc', { maxLength: 20 }), colX.type, y);
      
      const labelNormalized = normalizeTextForPdf(preuve.label || 'Sans description', { maxLength: 75 });
      const labelLines = doc.splitTextToSize(labelNormalized, 75);
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
    doc.text(`${emails.length} email(s) lie(s) a cet incident`, marginLeft, y);
    y += 8;

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      y = drawEmailBlock(doc, y, {
        sender: normalizeTextForPdf(email.sender || '', { maxLength: 80 }),
        recipient: normalizeTextForPdf(email.recipient || '', { maxLength: 80 }),
        date: formatPDFDateTime(email.received_at),
        subject: normalizeTextForPdf(email.subject || '', { maxLength: 150 }),
        body: normalizeTextForPdf(email.body || '', { maxLength: 5000 }),
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
    doc.text('Passages cles extraits des emails prouvant les faits allegues', marginLeft, y);
    y += 8;

    const citations = await extractEmailCitations(emails, normalizedFaits, normalizedDysfonctionnement);
    
    if (citations.length > 0) {
      for (let i = 0; i < citations.length; i++) {
        const citation = citations[i];
        y = drawEmailCitation(doc, y, {
          number: i + 1,
          text: normalizeTextForPdf(citation.text || '', { maxLength: 300 }),
          emailDate: citation.emailDate,
          emailSender: normalizeTextForPdf(citation.emailSender || '', { maxLength: 60 }),
          relevance: normalizeTextForPdf(citation.relevance || '', { maxLength: 50 })
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
  // SECTION 8: ANALYSE CONTEXTUELLE APPROFONDIE
  // ============================================
  
  if (deepAnalysis) {
    const deepResult = drawDeepAnalysisSection(doc, y, deepAnalysis, sectionNumber);
    y = deepResult.y;
    sectionNumber = deepResult.nextSection;
  }

  // ============================================
  // SECTION 9: RECHERCHE JURIDIQUE EN LIGNE
  // ============================================
  
  if (includeLegalSearch) {
    y = checkPageBreak(doc, y, 80);
    y = drawSectionTitle(doc, 'RECHERCHE JURIDIQUE EN LIGNE', y, { numbered: true, number: sectionNumber++, color: PDF_COLORS.legal });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    setColor(doc, PDF_COLORS.muted);
    doc.text('Jurisprudence et legislation trouvees automatiquement', marginLeft, y);
    y += 8;

    const legalResults = await searchLegalContext(
      normalizedType,
      normalizedFaits,
      normalizedDysfonctionnement,
      normalizedInstitution
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
        // Normalize result fields
        const normalizedResult = {
          ...result,
          title: normalizeTextForPdf(result.title || '', { maxLength: 150 }),
          summary: normalizeTextForPdf(result.summary || '', { maxLength: 400 }),
          reference_number: normalizeTextForPdf(result.reference_number || '', { maxLength: 50 }),
        };
        y = drawLegalSearchResult(doc, y, normalizedResult);
      }
    }

    // Legislation
    if (legalResults.legislation.length > 0) {
      y = checkPageBreak(doc, y, 40);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      setColor(doc, PDF_COLORS.evidence);
      doc.text('Legislation applicable', marginLeft, y);
      y += 8;

      for (const result of legalResults.legislation) {
        const normalizedResult = {
          ...result,
          title: normalizeTextForPdf(result.title || '', { maxLength: 150 }),
          summary: normalizeTextForPdf(result.summary || '', { maxLength: 400 }),
          reference_number: normalizeTextForPdf(result.reference_number || '', { maxLength: 50 }),
        };
        y = drawLegalSearchResult(doc, y, normalizedResult);
      }
    }

    if (legalResults.jurisprudence.length === 0 && legalResults.legislation.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      setColor(doc, PDF_COLORS.muted);
      doc.text('Aucun resultat de recherche juridique disponible.', marginLeft, y);
      y += 10;
    }
  }

  // ============================================
  // SECTION 10: PIECES JOINTES (ANALYSE IA)
  // ============================================
  
  if (includeAttachments && attachments.length > 0) {
    y = checkPageBreak(doc, y, 80);
    y = drawSectionTitle(doc, 'PIECES JOINTES (ANALYSE IA)', y, { numbered: true, number: sectionNumber++, color: PDF_COLORS.evidence });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    setColor(doc, PDF_COLORS.muted);
    doc.text(`${attachments.length} piece(s) jointe(s) analysee(s)`, marginLeft, y);
    y += 10;

    for (let i = 0; i < attachments.length; i++) {
      const attachment = attachments[i];
      const filename = normalizeTextForPdf(attachment.filename || 'Document sans nom', { maxLength: 60 });
      const analysis = attachment.ai_analysis;
      
      // Calculate box height based on content
      let boxHeight = 35;
      if (analysis?.violations && analysis.violations.length > 0) boxHeight += 12;
      if (analysis?.legal_analysis) boxHeight += 20;
      if (analysis?.extracted_text) boxHeight += 25;
      
      y = checkPageBreak(doc, y, boxHeight + 10);
      
      // Draw attachment box
      setColor(doc, PDF_COLORS.background, 'fill');
      doc.roundedRect(marginLeft, y - 2, contentWidth, boxHeight, 2, 2, 'F');
      
      // Severity indicator bar
      const severity = analysis?.severity || 'unknown';
      const severityColor = severity === 'critical' ? PDF_COLORS.critique 
        : severity === 'high' ? PDF_COLORS.haute 
        : severity === 'medium' ? PDF_COLORS.moyenne 
        : PDF_COLORS.faible;
      setColor(doc, severityColor, 'fill');
      doc.rect(marginLeft, y - 2, 4, boxHeight, 'F');
      
      // Attachment number and filename
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      setColor(doc, PDF_COLORS.text);
      doc.text(`[${i + 1}] ${filename}`, marginLeft + 8, y + 4);
      
      // Metadata
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      setColor(doc, PDF_COLORS.muted);
      const sizeKb = Math.round((attachment.size_bytes || 0) / 1024);
      const metadata = `${attachment.mime_type || 'Type inconnu'} | ${sizeKb} Ko`;
      doc.text(metadata, marginLeft + contentWidth - 50, y + 4);
      
      // Email source info
      if (attachment.email_sender) {
        const sender = normalizeTextForPdf(attachment.email_sender, { maxLength: 40 });
        doc.text(`Source: ${sender}`, marginLeft + 8, y + 10);
      }
      if (attachment.email_received_at) {
        doc.text(`Date: ${formatPDFDate(attachment.email_received_at)}`, marginLeft + 100, y + 10);
      }
      
      let contentY = y + 16;
      
      // AI Summary
      if (analysis?.summary) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        setColor(doc, PDF_COLORS.text);
        const summary = normalizeTextForPdf(analysis.summary, { maxLength: 200 });
        const summaryLines = doc.splitTextToSize(`Resume: ${summary}`, contentWidth - 15);
        doc.text(summaryLines.slice(0, 2), marginLeft + 8, contentY);
        contentY += summaryLines.slice(0, 2).length * 4 + 2;
      }
      
      // Violations detected
      if (analysis?.violations && analysis.violations.length > 0) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        setColor(doc, PDF_COLORS.critique);
        const violationsText = (analysis.violations as string[])
          .slice(0, 3)
          .map(v => normalizeTextForPdf(v, { maxLength: 40 }))
          .join(' | ');
        doc.text(`Violations: ${violationsText}`, marginLeft + 8, contentY);
        contentY += 6;
      }
      
      // Legal analysis excerpt
      if (analysis?.legal_analysis) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        setColor(doc, PDF_COLORS.legal);
        const legalText = normalizeTextForPdf(analysis.legal_analysis, { maxLength: 250 });
        const legalLines = doc.splitTextToSize(`Analyse juridique: ${legalText}`, contentWidth - 15);
        doc.text(legalLines.slice(0, 3), marginLeft + 8, contentY);
        contentY += legalLines.slice(0, 3).length * 3.5 + 2;
      }
      
      // Extracted text excerpt
      if (analysis?.extracted_text) {
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        setColor(doc, PDF_COLORS.muted);
        const extractedText = normalizeTextForPdf(analysis.extracted_text.substring(0, 400), { maxLength: 400 });
        const textLines = doc.splitTextToSize(`Contenu extrait: "${extractedText}..."`, contentWidth - 15);
        doc.text(textLines.slice(0, 4), marginLeft + 8, contentY);
      }
      
      y += boxHeight + 5;
    }
    
    y += 5;
  }

  // ============================================
  // AVERTISSEMENT LEGAL
  // ============================================
  
  y = checkPageBreak(doc, y, 30);
  
  setColor(doc, PDF_COLORS.background, 'fill');
  doc.roundedRect(marginLeft, y, contentWidth, 20, 2, 2, 'F');
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  setColor(doc, PDF_COLORS.muted);
  
  const disclaimer = 'Ce document est etabli conformement aux dispositions de la Loi federale sur la protection des donnees (LPD) ' +
    'et aux articles 388-456 du Code civil suisse relatifs a la protection de l\'adulte. ' +
    'Son contenu est strictement confidentiel et destine exclusivement aux autorites competentes.';
  
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
  if (includeAttachments) filename += '-pj';
  
  doc.save(`${filename}.pdf`);
  
  // Return blob for storage if needed
  return doc.output('blob');
}

/**
 * Génère et stocke le PDF dans Supabase Storage
 */
export async function generateAndStoreIncidentPDF(
  incident: IncidentData,
  options: GenerateIncidentPDFOptions = {},
  userId: string
): Promise<{ storagePath: string; fileName: string; fileSize: number } | null> {
  try {
    // Generate PDF blob (doesn't save automatically)
    const blob = await generateIncidentPDF(incident, options);
    
    // Create filename
    let filename = `fiche-incident-${incident.numero}`;
    if (options.includeEmails) filename += '-emails';
    if (options.includeLegalSearch) filename += '-juridique';
    filename += `-${Date.now()}.pdf`;
    
    const storagePath = `${userId}/${filename}`;
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('incident-exports')
      .upload(storagePath, blob, {
        contentType: 'application/pdf',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }
    
    // Save record in database
    const { error: dbError } = await supabase
      .from('incident_exports')
      .insert([{
        incident_id: incident.id,
        user_id: userId,
        file_name: filename,
        storage_path: storagePath,
        file_size_bytes: blob.size,
        export_options: options as any
      }]);
    
    if (dbError) {
      console.error('DB error:', dbError);
    }
    
    return { storagePath, fileName: filename, fileSize: blob.size };
  } catch (e) {
    console.error('Error storing PDF:', e);
    return null;
  }
}

/**
 * Génère le PDF, le sauvegarde localement et retourne le blob
 */
export async function generateAndDownloadIncidentPDF(
  incident: IncidentData,
  options: GenerateIncidentPDFOptions = {}
): Promise<Blob> {
  const blob = await generateIncidentPDF(incident, options);
  
  // Create download link
  let filename = `fiche-incident-${incident.numero}`;
  if (options.includeEmails) filename += '-emails';
  if (options.includeLegalSearch) filename += '-juridique';
  filename += '.pdf';
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  return blob;
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
