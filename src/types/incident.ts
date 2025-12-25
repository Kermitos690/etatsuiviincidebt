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
  institution: string;
  type: string;
  gravite: string;
  statut: string;
  titre: string;
  faits: string;
  dysfonctionnement: string;
  transmisJP: boolean;
  dateTransmissionJP?: string;
  preuves: Proof[];
  score: number;
  priorite: 'faible' | 'moyen' | 'eleve' | 'critique';
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
