import type { Incident, Proof } from '@/types/incident';

/**
 * Centralise les mappings DB <-> UI pour éviter les divergences
 * (même schéma, même conversion, partout).
 */

// DB row (Supabase) -> Incident (app)
export const mapDbToIncident = (inc: any): Incident => ({
  id: inc.id,
  numero: inc.numero,
  dateIncident: inc.date_incident,
  dateCreation: inc.date_creation,
  institution: inc.institution,
  titre: inc.titre,
  faits: inc.faits,
  dysfonctionnement: inc.dysfonctionnement,
  type: inc.type,
  gravite: inc.gravite,
  statut: inc.statut,
  priorite: (inc.priorite as 'faible' | 'moyen' | 'eleve' | 'critique') || 'faible',
  score: inc.score,
  transmisJP: inc.transmis_jp,
  dateTransmissionJP: inc.date_transmission_jp || undefined,
  preuves: (inc.preuves as unknown as Proof[]) || [],
});

// Partial Incident (app) -> DB patch (Supabase update)
export const mapIncidentToDb = (inc: Partial<Incident>) => ({
  ...(inc.dateIncident && { date_incident: inc.dateIncident }),
  ...(inc.institution && { institution: inc.institution }),
  ...(inc.type && { type: inc.type }),
  ...(inc.gravite && { gravite: inc.gravite }),
  ...(inc.statut && { statut: inc.statut }),
  ...(inc.titre && { titre: inc.titre }),
  ...(inc.faits && { faits: inc.faits }),
  ...(inc.dysfonctionnement && { dysfonctionnement: inc.dysfonctionnement }),
  ...(inc.transmisJP !== undefined && { transmis_jp: inc.transmisJP }),
  ...(inc.dateTransmissionJP !== undefined && {
    date_transmission_jp: inc.dateTransmissionJP || null,
  }),
  ...(inc.preuves && { preuves: inc.preuves as unknown as any }),
  ...(inc.score !== undefined && { score: inc.score }),
  ...(inc.priorite && { priorite: inc.priorite }),
});