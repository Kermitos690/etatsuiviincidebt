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
  
  // Computed
  getFilteredIncidents: () => Incident[];
  getNextNumero: () => number;
}

export const useIncidentStore = create<IncidentStore>()(
  persist(
    (set, get) => ({
      incidents: [],
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
