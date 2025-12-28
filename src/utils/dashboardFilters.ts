import type { Incident } from '@/types/incident';

// Keywords that indicate spam/irrelevant incidents
const SPAM_KEYWORDS = [
  'hors sujet',
  'phishing',
  'spam',
  'promotion',
  'newsletter',
  'publicité',
  'offre spéciale',
  'unsubscribe',
  'se désabonner'
];

// Suspicious domains
const SPAM_DOMAINS = [
  '.ua',
  '.ru',
  'marketing',
  'promo',
  'newsletter'
];

// Status to exclude from dashboard stats
const EXCLUDED_STATUSES = ['Rejeté', 'Classé'];

/**
 * Normalize institution names to group variations
 */
export function normalizeInstitutionName(name: string): string {
  const normalized = name.trim().toUpperCase();
  
  // SCTP variations
  if (normalized.includes('CURATELLE') || normalized.includes('SCTP')) {
    if (normalized.includes('VD') || normalized.includes('VAUD')) {
      return 'SCTP (VD)';
    }
    return 'Service Curatelles';
  }
  
  // Justice de Paix variations
  if (normalized.includes('JUSTICE DE PAIX') || normalized.includes('JP')) {
    if (normalized.includes('LAUSANNE')) return 'JP Lausanne';
    if (normalized.includes('NORD')) return 'JP Nord Vaudois';
    if (normalized.includes('OUEST')) return 'JP Ouest';
    return 'Justice de Paix';
  }
  
  // Tribunal variations
  if (normalized.includes('TRIBUNAL')) {
    if (normalized.includes('CANTONAL')) return 'Tribunal Cantonal';
    if (normalized.includes('FÉDÉRAL')) return 'Tribunal Fédéral';
    return 'Tribunal';
  }
  
  // APEA variations
  if (normalized.includes('APEA') || normalized.includes('PROTECTION ENFANT')) {
    return 'APEA';
  }
  
  // Keep original but truncate if too long
  if (name.length > 25) {
    return name.substring(0, 22) + '...';
  }
  
  return name;
}

/**
 * Check if an incident is spam/irrelevant
 */
export function isSpamIncident(incident: Incident): boolean {
  const titleLower = incident.titre.toLowerCase();
  const factsLower = incident.faits.toLowerCase();
  const institutionLower = incident.institution.toLowerCase();
  
  // Check for spam keywords in title/facts
  for (const keyword of SPAM_KEYWORDS) {
    if (titleLower.includes(keyword) || factsLower.includes(keyword)) {
      return true;
    }
  }
  
  // Check for suspicious domains in institution
  for (const domain of SPAM_DOMAINS) {
    if (institutionLower.includes(domain)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Filter incidents to only relevant ones for dashboard
 */
export function getRelevantIncidents(incidents: Incident[]): Incident[] {
  return incidents.filter(incident => {
    // Exclude rejected/classified status
    if (EXCLUDED_STATUSES.includes(incident.statut)) {
      return false;
    }
    
    // Exclude spam
    if (isSpamIncident(incident)) {
      return false;
    }
    
    return true;
  });
}

/**
 * Get count of excluded incidents for transparency
 */
export function getExcludedCount(incidents: Incident[]): number {
  return incidents.length - getRelevantIncidents(incidents).length;
}

/**
 * Truncate text for chart labels
 */
export function truncateLabel(text: string, maxLength: number = 20): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
