/**
 * Centralized incident mappers
 * Single source of truth for DB <-> UI data transformation
 * 
 * IMPORTANT: Strict separation between FACTS and ANALYSIS
 * - faits: Factual, objective elements (dates, actions, documents)
 * - dysfonctionnement: Legal qualification and interpretation
 * - analysisNotes: AI-generated analysis (separate from facts)
 */

import type { Incident, Proof, IncidentEvent } from '@/types/incident';
import { calculateScore, getPriorityFromScore } from '@/config/appConfig';

/**
 * Map database row to Incident type
 */
export function mapDbToIncident(row: any): Incident {
  if (!row) {
    throw new Error('Cannot map null/undefined database row to Incident');
  }
  
  return {
    id: row.id,
    numero: row.numero ?? 0,
    dateIncident: row.date_incident ?? new Date().toISOString().split('T')[0],
    dateCreation: row.date_creation ?? row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? undefined,
    institution: row.institution ?? 'Non spécifié',
    titre: row.titre ?? 'Sans titre',
    // FAITS: Éléments factuels uniquement
    faits: row.faits ?? '',
    // ANALYSE: Qualification juridique
    dysfonctionnement: row.dysfonctionnement ?? '',
    analysisNotes: row.analysis_notes ?? undefined,
    type: row.type ?? 'Autre',
    gravite: row.gravite ?? 'Modéré',
    statut: row.statut ?? 'Ouvert',
    priorite: (row.priorite as Incident['priorite']) ?? 'faible',
    score: row.score ?? 0,
    transmisJP: row.transmis_jp ?? false,
    dateTransmissionJP: row.date_transmission_jp ?? undefined,
    preuves: Array.isArray(row.preuves) ? (row.preuves as Proof[]) : [],
    // Audit fields
    modificationReason: row.modification_reason ?? undefined,
    isLocked: row.is_locked ?? false,
  };
}

/**
 * Map incident event from database
 */
export function mapDbToIncidentEvent(row: any): IncidentEvent {
  return {
    id: row.id,
    incidentId: row.incident_id,
    userId: row.user_id,
    eventType: row.event_type,
    eventDescription: row.event_description,
    changes: row.changes ?? undefined,
    modificationReason: row.modification_reason ?? undefined,
    createdAt: row.created_at,
  };
}

/**
 * Map Incident to database insert/update format
 */
export function mapIncidentToDb(incident: Partial<Incident>): Record<string, any> {
  const dbRecord: Record<string, any> = {};
  
  if (incident.dateIncident !== undefined) {
    dbRecord.date_incident = incident.dateIncident;
  }
  if (incident.institution !== undefined) {
    dbRecord.institution = incident.institution;
  }
  if (incident.type !== undefined) {
    dbRecord.type = incident.type;
  }
  if (incident.gravite !== undefined) {
    dbRecord.gravite = incident.gravite;
  }
  if (incident.statut !== undefined) {
    dbRecord.statut = incident.statut;
  }
  if (incident.titre !== undefined) {
    dbRecord.titre = incident.titre;
  }
  if (incident.faits !== undefined) {
    dbRecord.faits = incident.faits;
  }
  if (incident.dysfonctionnement !== undefined) {
    dbRecord.dysfonctionnement = incident.dysfonctionnement;
  }
  if (incident.analysisNotes !== undefined) {
    dbRecord.analysis_notes = incident.analysisNotes;
  }
  if (incident.transmisJP !== undefined) {
    dbRecord.transmis_jp = incident.transmisJP;
  }
  if (incident.dateTransmissionJP !== undefined) {
    dbRecord.date_transmission_jp = incident.dateTransmissionJP || null;
  }
  if (incident.preuves !== undefined) {
    dbRecord.preuves = incident.preuves;
  }
  if (incident.score !== undefined) {
    dbRecord.score = incident.score;
  }
  if (incident.priorite !== undefined) {
    dbRecord.priorite = incident.priorite;
  }
  if (incident.modificationReason !== undefined) {
    dbRecord.modification_reason = incident.modificationReason;
  }
  if (incident.isLocked !== undefined) {
    dbRecord.is_locked = incident.isLocked;
  }
  
  return dbRecord;
}

/**
 * Check if incident can be modified (not locked)
 */
export function canModifyIncident(incident: Incident): { 
  canModify: boolean; 
  reason?: string 
} {
  if (incident.isLocked) {
    return { 
      canModify: false, 
      reason: 'Cet incident est verrouillé car il a été transmis au Juge des Protections' 
    };
  }
  if (incident.transmisJP) {
    return { 
      canModify: false, 
      reason: 'Cet incident ne peut plus être modifié car il a été transmis au JP. Toute modification nécessite un déverrouillage explicite.' 
    };
  }
  return { canModify: true };
}

/**
 * Calculate score and priority for an incident
 */
export function calculateIncidentMetrics(
  incident: Pick<Incident, 'gravite' | 'type' | 'transmisJP'>,
  config: { poidsGravite: Record<string, number>; poidsType: Record<string, number> }
): { score: number; priorite: Incident['priorite'] } {
  const score = calculateScore(
    incident.gravite,
    incident.type,
    incident.transmisJP,
    config.poidsGravite,
    config.poidsType
  );
  const priorite = getPriorityFromScore(score);
  
  return { score, priorite };
}

/**
 * Validate required incident fields
 */
export function validateIncident(incident: Partial<Incident>): { 
  isValid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];
  
  if (!incident.dateIncident) {
    errors.push('La date de l\'incident est obligatoire');
  }
  if (!incident.institution?.trim()) {
    errors.push('L\'institution est obligatoire');
  }
  if (!incident.type?.trim()) {
    errors.push('Le type d\'incident est obligatoire');
  }
  if (!incident.gravite?.trim()) {
    errors.push('La gravité est obligatoire');
  }
  if (!incident.titre?.trim()) {
    errors.push('Le titre est obligatoire');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create a deduplication key for incident
 */
export function createDedupKey(incident: Pick<Incident, 'dateIncident' | 'institution' | 'titre'>): string {
  const normalizedTitle = incident.titre.toLowerCase().trim().replace(/\s+/g, ' ');
  return `${incident.dateIncident}_${incident.institution}_${normalizedTitle}`.slice(0, 200);
}
