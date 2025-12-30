export interface Proof {
  id: string;
  type: 'email' | 'screenshot' | 'document' | 'link';
  label: string;
  url: string;
}

export interface Incident {
  id: string;
  numero: number;
  dateIncident: string;
  dateCreation: string;
  updatedAt?: string;
  institution: string;
  type: string;
  gravite: string;
  statut: string;
  titre: string;
  // FAITS: Éléments factuels et objectifs (dates, actions, documents)
  faits: string;
  // ANALYSE: Interprétation et qualification juridique
  dysfonctionnement: string;
  analysisNotes?: string;
  transmisJP: boolean;
  dateTransmissionJP?: string;
  preuves: Proof[];
  score: number;
  priorite: 'faible' | 'moyen' | 'eleve' | 'critique';
  // Audit fields
  modificationReason?: string;
  isLocked?: boolean;
}

// Event types for incident audit trail
export type IncidentEventType = 'creation' | 'update' | 'transmission_jp' | 'lock' | 'unlock' | 'status_change';

export interface IncidentEvent {
  id: string;
  incidentId: string;
  userId?: string;
  eventType: IncidentEventType;
  eventDescription: string;
  changes?: Record<string, { old: any; new: any }>;
  modificationReason?: string;
  createdAt: string;
}

export interface IncidentFormData {
  dateIncident: string;
  institution: string;
  type: string;
  gravite: string;
  titre: string;
  faits: string;
  dysfonctionnement: string;
  transmisJP: boolean;
  preuves: Proof[];
}

export interface AIAnalysisResult {
  constats: string[];
  dysfonctionnements: string[];
  graviteSuggere: string;
  typeSuggere: string;
  confiance: number;
  resume: string;
}

export interface FilterState {
  dateDebut?: string;
  dateFin?: string;
  institution?: string;
  type?: string;
  gravite?: string;
  statut?: string;
  recherche?: string;
}

export interface KPIData {
  total: number;
  ouverts: number;
  nonResolus: number;
  transmisJP: number;
  scoreMoyen: number;
}

export interface AppConfig {
  googleSheetId: string;
  institutions: string[];
  types: string[];
  statuts: string[];
  gravites: string[];
  poidsGravite: Record<string, number>;
  poidsType: Record<string, number>;
}
