import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Incident, FilterState, AppConfig } from '@/types/incident';
import { 
  DEFAULT_INSTITUTIONS, 
  DEFAULT_TYPES, 
  DEFAULT_STATUTS, 
  DEFAULT_GRAVITES,
  POIDS_GRAVITE,
  POIDS_TYPE,
  calculateScore,
  getPriorityFromScore
} from '@/config/appConfig';

// Données de test réalistes
const generateTestData = (): Incident[] => {
  const testIncidents: Omit<Incident, 'score' | 'priorite'>[] = [
    {
      id: '1',
      numero: 1,
      dateIncident: '2025-12-20',
      dateCreation: '2025-12-20T10:30:00Z',
      institution: 'Hôpital Central',
      titre: 'Erreur de dosage médicamenteux',
      faits: 'Un patient a reçu une dose double de son traitement anticoagulant suite à une erreur de transcription.',
      dysfonctionnement: 'Défaut de vérification croisée lors de la préparation des médicaments.',
      type: 'Erreur médicamenteuse',
      gravite: 'Grave',
      statut: 'En cours',
      transmisJP: true,
      preuves: [
        { id: '1a', type: 'document', label: 'Ordonnance originale', url: '#' },
        { id: '1b', type: 'document', label: 'Rapport infirmier', url: '#' }
      ]
    },
    {
      id: '2',
      numero: 2,
      dateIncident: '2025-12-18',
      dateCreation: '2025-12-18T14:15:00Z',
      institution: 'Clinique du Parc',
      titre: 'Retard de prise en charge aux urgences',
      faits: 'Un patient présentant des douleurs thoraciques a attendu 3h avant examen médical.',
      dysfonctionnement: 'Sous-effectif et mauvaise priorisation du triage.',
      type: 'Retard de prise en charge',
      gravite: 'Modéré',
      statut: 'Ouvert',
      transmisJP: false,
      preuves: [
        { id: '2a', type: 'document', label: 'Fiche d\'admission', url: '#' },
        { id: '2b', type: 'document', label: 'Témoignage famille', url: '#' }
      ]
    },
    {
      id: '3',
      numero: 3,
      dateIncident: '2025-12-15',
      dateCreation: '2025-12-15T09:00:00Z',
      institution: 'EHPAD Les Roses',
      titre: 'Chute d\'un résident sans surveillance',
      faits: 'Un résident de 85 ans a chuté dans le couloir pendant la nuit, fracture du col du fémur.',
      dysfonctionnement: 'Personnel insuffisant pour la surveillance nocturne.',
      type: 'Accident/Chute',
      gravite: 'Critique',
      statut: 'Transmis',
      transmisJP: true,
      preuves: [
        { id: '3a', type: 'document', label: 'Rapport d\'incident', url: '#' },
        { id: '3b', type: 'screenshot', label: 'Photos', url: '#' },
        { id: '3c', type: 'document', label: 'Certificat médical', url: '#' }
      ]
    },
    {
      id: '4',
      numero: 4,
      dateIncident: '2025-12-12',
      dateCreation: '2025-12-12T16:45:00Z',
      institution: 'Hôpital Central',
      titre: 'Erreur d\'identité patient',
      faits: 'Deux patients aux noms similaires ont eu leurs dossiers échangés temporairement.',
      dysfonctionnement: 'Non-respect du protocole d\'identification.',
      type: 'Erreur administrative',
      gravite: 'Modéré',
      statut: 'Résolu',
      transmisJP: false,
      preuves: [
        { id: '4a', type: 'document', label: 'Dossiers patients', url: '#' }
      ]
    },
    {
      id: '5',
      numero: 5,
      dateIncident: '2025-12-10',
      dateCreation: '2025-12-10T11:20:00Z',
      institution: 'Centre de Soins St-Michel',
      titre: 'Infection nosocomiale post-opératoire',
      faits: 'Infection du site opératoire détectée 5 jours après une chirurgie orthopédique.',
      dysfonctionnement: 'Protocole d\'hygiène non respecté au bloc.',
      type: 'Infection nosocomiale',
      gravite: 'Grave',
      statut: 'En cours',
      transmisJP: true,
      preuves: [
        { id: '5a', type: 'document', label: 'Analyses biologiques', url: '#' },
        { id: '5b', type: 'document', label: 'Rapport chirurgien', url: '#' }
      ]
    },
    {
      id: '6',
      numero: 6,
      dateIncident: '2025-12-08',
      dateCreation: '2025-12-08T08:30:00Z',
      institution: 'Clinique du Parc',
      titre: 'Panne équipement de monitoring',
      faits: 'Le moniteur cardiaque d\'un patient en soins intensifs s\'est arrêté sans alerte.',
      dysfonctionnement: 'Maintenance préventive non effectuée.',
      type: 'Défaillance équipement',
      gravite: 'Critique',
      statut: 'Résolu',
      transmisJP: true,
      preuves: [
        { id: '6a', type: 'document', label: 'Rapport technique', url: '#' },
        { id: '6b', type: 'document', label: 'Journal maintenance', url: '#' }
      ]
    },
    {
      id: '7',
      numero: 7,
      dateIncident: '2025-12-05',
      dateCreation: '2025-12-05T13:00:00Z',
      institution: 'EHPAD Les Roses',
      titre: 'Fugue d\'un résident',
      faits: 'Un résident atteint de troubles cognitifs a quitté l\'établissement sans être remarqué.',
      dysfonctionnement: 'Système de surveillance défaillant.',
      type: 'Fugue/Disparition',
      gravite: 'Grave',
      statut: 'Classé',
      transmisJP: true,
      preuves: [
        { id: '7a', type: 'document', label: 'Rapport sécurité', url: '#' },
        { id: '7b', type: 'document', label: 'Témoignages', url: '#' }
      ]
    },
    {
      id: '8',
      numero: 8,
      dateIncident: '2025-12-01',
      dateCreation: '2025-12-01T10:00:00Z',
      institution: 'Hôpital Central',
      titre: 'Communication défaillante entre services',
      faits: 'Résultats d\'analyses critiques non transmis au médecin traitant pendant 48h.',
      dysfonctionnement: 'Processus de communication inter-services inadapté.',
      type: 'Défaut de communication',
      gravite: 'Modéré',
      statut: 'Ouvert',
      transmisJP: false,
      preuves: [
        { id: '8a', type: 'email', label: 'Emails', url: '#' },
        { id: '8b', type: 'document', label: 'Dossier patient', url: '#' }
      ]
    },
    {
      id: '9',
      numero: 9,
      dateIncident: '2025-11-28',
      dateCreation: '2025-11-28T15:30:00Z',
      institution: 'Centre de Soins St-Michel',
      titre: 'Agression verbale par un patient',
      faits: 'Une infirmière a été agressée verbalement et menacée par un patient agité.',
      dysfonctionnement: 'Manque de formation en gestion de crise.',
      type: 'Violence/Agression',
      gravite: 'Mineur',
      statut: 'Classé',
      transmisJP: false,
      preuves: [
        { id: '9a', type: 'document', label: 'Déclaration infirmière', url: '#' },
        { id: '9b', type: 'document', label: 'Témoignage collègue', url: '#' }
      ]
    },
    {
      id: '10',
      numero: 10,
      dateIncident: '2025-11-25',
      dateCreation: '2025-11-25T09:45:00Z',
      institution: 'Clinique du Parc',
      titre: 'Allergie non détectée avant traitement',
      faits: 'Réaction allergique à un antibiotique malgré antécédent connu dans le dossier.',
      dysfonctionnement: 'Dossier patient mal consulté avant prescription.',
      type: 'Erreur médicamenteuse',
      gravite: 'Grave',
      statut: 'En cours',
      transmisJP: true,
      preuves: [
        { id: '10a', type: 'document', label: 'Dossier médical', url: '#' },
        { id: '10b', type: 'document', label: 'Rapport réaction', url: '#' }
      ]
    }
  ];

  return testIncidents.map(inc => {
    const score = calculateScore(inc.gravite, inc.type, inc.transmisJP, POIDS_GRAVITE, POIDS_TYPE);
    return {
      ...inc,
      score,
      priorite: getPriorityFromScore(score)
    };
  });
};

interface IncidentStore {
  incidents: Incident[];
  filters: FilterState;
  config: AppConfig;
  
  // Actions
  setIncidents: (incidents: Incident[]) => void;
  addIncident: (incident: Omit<Incident, 'id' | 'numero' | 'score' | 'priorite' | 'dateCreation'>) => Incident;
  updateIncident: (id: string, updates: Partial<Incident>) => void;
  deleteIncident: (id: string) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;
  updateConfig: (config: Partial<AppConfig>) => void;
  loadTestData: () => void;
  
  // Computed
  getFilteredIncidents: () => Incident[];
  getNextNumero: () => number;
}

export const useIncidentStore = create<IncidentStore>()(
  persist(
    (set, get) => ({
      incidents: generateTestData(), // Load test data by default
      filters: {},
      config: {
        googleSheetId: '',
        institutions: DEFAULT_INSTITUTIONS,
        types: DEFAULT_TYPES,
        statuts: DEFAULT_STATUTS,
        gravites: DEFAULT_GRAVITES,
        poidsGravite: POIDS_GRAVITE,
        poidsType: POIDS_TYPE
      },

      setIncidents: (incidents) => set({ incidents }),

      loadTestData: () => set({ incidents: generateTestData() }),

      addIncident: (incidentData) => {
        const state = get();
        const numero = state.getNextNumero();
        const score = calculateScore(
          incidentData.gravite,
          incidentData.type,
          incidentData.transmisJP,
          state.config.poidsGravite,
          state.config.poidsType
        );
        
        const newIncident: Incident = {
          ...incidentData,
          id: crypto.randomUUID(),
          numero,
          score,
          priorite: getPriorityFromScore(score),
          dateCreation: new Date().toISOString()
        };

        set({ incidents: [...state.incidents, newIncident] });
        return newIncident;
      },

      updateIncident: (id, updates) => {
        const state = get();
        set({
          incidents: state.incidents.map((inc) => {
            if (inc.id !== id) return inc;
            
            const updated = { ...inc, ...updates };
            // Recalculer le score si nécessaire
            if (updates.gravite || updates.type || updates.transmisJP !== undefined) {
              updated.score = calculateScore(
                updated.gravite,
                updated.type,
                updated.transmisJP,
                state.config.poidsGravite,
                state.config.poidsType
              );
              updated.priorite = getPriorityFromScore(updated.score);
            }
            return updated;
          })
        });
      },

      deleteIncident: (id) => {
        set({ incidents: get().incidents.filter((inc) => inc.id !== id) });
      },

      setFilters: (newFilters) => {
        set({ filters: { ...get().filters, ...newFilters } });
      },

      clearFilters: () => set({ filters: {} }),

      updateConfig: (newConfig) => {
        set({ config: { ...get().config, ...newConfig } });
      },

      getFilteredIncidents: () => {
        const { incidents, filters } = get();
        
        return incidents.filter((inc) => {
          if (filters.dateDebut && inc.dateIncident < filters.dateDebut) return false;
          if (filters.dateFin && inc.dateIncident > filters.dateFin) return false;
          if (filters.institution && inc.institution !== filters.institution) return false;
          if (filters.type && inc.type !== filters.type) return false;
          if (filters.gravite && inc.gravite !== filters.gravite) return false;
          if (filters.statut && inc.statut !== filters.statut) return false;
          if (filters.recherche) {
            const search = filters.recherche.toLowerCase();
            const matchTitre = inc.titre.toLowerCase().includes(search);
            const matchFaits = inc.faits.toLowerCase().includes(search);
            const matchDysf = inc.dysfonctionnement.toLowerCase().includes(search);
            if (!matchTitre && !matchFaits && !matchDysf) return false;
          }
          return true;
        });
      },

      getNextNumero: () => {
        const { incidents } = get();
        if (incidents.length === 0) return 1;
        return Math.max(...incidents.map((i) => i.numero)) + 1;
      }
    }),
    {
      name: 'incident-store'
    }
  )
);
