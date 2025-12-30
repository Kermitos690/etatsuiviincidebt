/**
 * PDF Timeline - Génération de chronologie visuelle pour exports PDF
 */

import jsPDF from 'jspdf';
import {
  PDF_COLORS,
  PDF_DIMENSIONS,
  setColor,
  getSeverityColor,
  checkPageBreak,
  formatPDFDate,
  normalizeTextForPdf,
} from './pdfStyles';

export interface TimelineEvent {
  date: string;
  title: string;
  description?: string;
  type: 'email' | 'incident' | 'event' | 'deadline' | 'promise' | 'contradiction';
  severity?: 'critique' | 'haute' | 'moyenne' | 'faible';
  actor?: string;
  emailId?: string;
  incidentId?: string;
}

interface TimelineStyle {
  lineColor: typeof PDF_COLORS[keyof typeof PDF_COLORS];
  nodeRadius: number;
  nodeSpacing: number;
}

const DEFAULT_STYLE: TimelineStyle = {
  lineColor: PDF_COLORS.secondary,
  nodeRadius: 4,
  nodeSpacing: 25,
};

/**
 * Retourne la couleur selon le type d'événement
 */
function getEventTypeColor(type: TimelineEvent['type']): typeof PDF_COLORS[keyof typeof PDF_COLORS] {
  switch (type) {
    case 'email':
      return PDF_COLORS.primary;
    case 'incident':
      return PDF_COLORS.critique;
    case 'event':
      return PDF_COLORS.evidence;
    case 'deadline':
      return PDF_COLORS.haute;
    case 'promise':
      return PDF_COLORS.faible;
    case 'contradiction':
      return PDF_COLORS.critique;
    default:
      return PDF_COLORS.secondary;
  }
}

/**
 * Retourne l'icône/symbole selon le type d'événement
 */
function getEventTypeLabel(type: TimelineEvent['type']): string {
  switch (type) {
    case 'email':
      return 'EMAIL';
    case 'incident':
      return 'INCIDENT';
    case 'event':
      return 'EVENEMENT';
    case 'deadline':
      return 'DELAI';
    case 'promise':
      return 'ENGAGEMENT';
    case 'contradiction':
      return 'CONTRADICTION';
    default:
      return 'FAIT';
  }
}

/**
 * Dessine un nœud de la timeline
 */
function drawTimelineNode(
  doc: jsPDF,
  x: number,
  y: number,
  event: TimelineEvent,
  isLast: boolean,
  style: TimelineStyle
): number {
  const { marginLeft, contentWidth } = PDF_DIMENSIONS;
  const nodeColor = event.severity 
    ? getSeverityColor(event.severity) 
    : getEventTypeColor(event.type);
  
  // Ligne verticale vers le prochain nœud (si pas le dernier)
  if (!isLast) {
    setColor(doc, style.lineColor, 'draw');
    doc.setLineWidth(0.5);
    doc.line(x, y + style.nodeRadius, x, y + style.nodeSpacing);
  }
  
  // Cercle du nœud
  setColor(doc, nodeColor, 'fill');
  doc.circle(x, y, style.nodeRadius, 'F');
  
  // Cercle intérieur blanc pour effet hollow
  setColor(doc, PDF_COLORS.white, 'fill');
  doc.circle(x, y, style.nodeRadius - 1.5, 'F');
  
  // Point central coloré
  setColor(doc, nodeColor, 'fill');
  doc.circle(x, y, 1.5, 'F');
  
  // Date à gauche du nœud
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  setColor(doc, PDF_COLORS.muted);
  const dateStr = formatPDFDate(event.date);
  doc.text(dateStr, x - 5, y + 1, { align: 'right' });
  
  // Type badge
  const typeLabel = getEventTypeLabel(event.type);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  setColor(doc, nodeColor, 'fill');
  const badgeWidth = doc.getTextWidth(typeLabel) + 4;
  doc.roundedRect(x + 8, y - 4, badgeWidth, 6, 1, 1, 'F');
  setColor(doc, PDF_COLORS.white);
  doc.text(typeLabel, x + 10, y);
  
  // Titre
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setColor(doc, PDF_COLORS.text);
  const title = normalizeTextForPdf(event.title, { maxLength: 80 });
  doc.text(title, x + 8 + badgeWidth + 4, y);
  
  // Acteur si présent
  let currentY = y + 4;
  if (event.actor) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    setColor(doc, PDF_COLORS.secondary);
    const actor = normalizeTextForPdf(event.actor, { maxLength: 50 });
    doc.text(`Par: ${actor}`, x + 8, currentY + 3);
    currentY += 5;
  }
  
  // Description si présente
  if (event.description) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    setColor(doc, PDF_COLORS.text);
    const description = normalizeTextForPdf(event.description, { maxLength: 150 });
    const descLines = doc.splitTextToSize(description, contentWidth - x - 10);
    doc.text(descLines.slice(0, 2), x + 8, currentY + 4);
    currentY += descLines.slice(0, 2).length * 4;
  }
  
  return Math.max(style.nodeSpacing, currentY - y + 8);
}

/**
 * Dessine une chronologie visuelle complète dans le PDF
 */
export function drawTimeline(
  doc: jsPDF,
  y: number,
  events: TimelineEvent[],
  title: string = 'CHRONOLOGIE DES EVENEMENTS',
  options: Partial<TimelineStyle> = {}
): number {
  const { marginLeft, contentWidth } = PDF_DIMENSIONS;
  const style = { ...DEFAULT_STYLE, ...options };
  
  if (!events || events.length === 0) {
    return y;
  }
  
  // Trier les événements par date
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Titre de la section
  y = checkPageBreak(doc, y, 60);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  setColor(doc, PDF_COLORS.primary);
  doc.text(title, marginLeft, y);
  
  // Ligne de titre
  setColor(doc, PDF_COLORS.primary, 'draw');
  doc.setLineWidth(0.5);
  const titleWidth = doc.getTextWidth(title);
  doc.line(marginLeft, y + 2, marginLeft + titleWidth, y + 2);
  
  y += 12;
  
  // Position X de la ligne verticale (décalée pour laisser place aux dates)
  const lineX = marginLeft + 30;
  
  // Légende
  y = checkPageBreak(doc, y, 20);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  setColor(doc, PDF_COLORS.muted);
  
  const legendItems = [
    { type: 'email' as const, label: 'Email' },
    { type: 'incident' as const, label: 'Incident' },
    { type: 'event' as const, label: 'Evenement' },
    { type: 'deadline' as const, label: 'Delai' },
    { type: 'contradiction' as const, label: 'Contradiction' },
  ];
  
  let legendX = marginLeft;
  for (const item of legendItems) {
    const color = getEventTypeColor(item.type);
    setColor(doc, color, 'fill');
    doc.circle(legendX + 2, y, 2, 'F');
    doc.setFontSize(7);
    setColor(doc, PDF_COLORS.text);
    doc.text(item.label, legendX + 6, y + 1);
    legendX += doc.getTextWidth(item.label) + 15;
  }
  
  y += 10;
  
  // Dessiner chaque événement
  for (let i = 0; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];
    const isLast = i === sortedEvents.length - 1;
    
    // Vérifier si on a besoin d'une nouvelle page
    y = checkPageBreak(doc, y, style.nodeSpacing + 20);
    
    const nodeHeight = drawTimelineNode(doc, lineX, y, event, isLast, style);
    y += nodeHeight;
  }
  
  return y + 10;
}

/**
 * Génère les événements de timeline à partir des emails
 */
export function generateTimelineFromEmails(
  emails: Array<{
    id: string;
    sender: string;
    received_at: string;
    subject: string;
    body?: string;
    ai_analysis?: any;
  }>
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  
  for (const email of emails) {
    // Événement principal: l'email
    events.push({
      date: email.received_at,
      title: normalizeTextForPdf(email.subject, { maxLength: 60 }),
      type: 'email',
      actor: email.sender,
      emailId: email.id,
    });
    
    // Analyser le contenu pour détecter des événements supplémentaires
    if (email.ai_analysis) {
      const analysis = email.ai_analysis;
      
      // Promesses détectées
      if (analysis.commitments) {
        for (const commitment of analysis.commitments.slice(0, 2)) {
          events.push({
            date: email.received_at,
            title: normalizeTextForPdf(commitment.text || commitment, { maxLength: 60 }),
            description: commitment.deadline ? `Delai: ${commitment.deadline}` : undefined,
            type: 'promise',
            actor: email.sender,
          });
        }
      }
      
      // Délais mentionnés
      if (analysis.deadlines) {
        for (const deadline of analysis.deadlines.slice(0, 2)) {
          events.push({
            date: deadline.date || email.received_at,
            title: normalizeTextForPdf(deadline.description || deadline, { maxLength: 60 }),
            type: 'deadline',
            severity: 'haute',
          });
        }
      }
      
      // Contradictions
      if (analysis.contradictions) {
        for (const contradiction of analysis.contradictions.slice(0, 2)) {
          events.push({
            date: email.received_at,
            title: normalizeTextForPdf(contradiction.summary || contradiction, { maxLength: 60 }),
            type: 'contradiction',
            severity: 'critique',
            actor: contradiction.actor,
          });
        }
      }
    }
  }
  
  // Trier et retourner
  return events.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * Génère les événements de timeline à partir des incidents
 */
export function generateTimelineFromIncidents(
  incidents: Array<{
    id: string;
    numero: number;
    titre: string;
    date_incident: string;
    gravite: string;
    institution: string;
  }>
): TimelineEvent[] {
  return incidents.map(incident => ({
    date: incident.date_incident,
    title: `#${incident.numero} - ${normalizeTextForPdf(incident.titre, { maxLength: 50 })}`,
    type: 'incident' as const,
    severity: incident.gravite?.toLowerCase() as TimelineEvent['severity'],
    actor: incident.institution,
    incidentId: incident.id,
  }));
}

/**
 * Génère les événements de timeline à partir des events manuels
 */
export function generateTimelineFromEvents(
  events: Array<{
    id: string;
    title: string;
    event_date: string;
    description?: string;
    source_type?: string;
    ai_analysis?: any;
  }>
): TimelineEvent[] {
  return events.map(event => ({
    date: event.event_date,
    title: normalizeTextForPdf(event.title, { maxLength: 60 }),
    description: event.description ? normalizeTextForPdf(event.description, { maxLength: 100 }) : undefined,
    type: 'event' as const,
    severity: event.ai_analysis?.severity?.toLowerCase() as TimelineEvent['severity'],
  }));
}
