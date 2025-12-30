/**
 * Centralized incident mappers
 * Single source of truth for DB <-> UI data transformation
 */

import type { Incident, Proof } from '@/types/incident';
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
    institution: row.institution ?? 'Non spécifié',
    titre: row.titre ?? 'Sans titre',
    faits: row.faits ?? '',
    dysfonctionnement: row.dysfonctionnement ?? '',
    type: row.type ?? 'Autre',
    gravite: row.gravite ?? 'Modéré',
    statut: row.statut ?? 'Ouvert',
    priorite: (row.priorite as Incident['priorite']) ?? 'faible',
    score: row.score ?? 0,
    transmisJP: row.transmis_jp ?? false,
    dateTransmissionJP: row.date_transmission_jp ?? undefined,
    preuves: Array.isArray(row.preuves) ? (row.preuves as Proof[]) : [],
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
  
  return dbRecord;
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
