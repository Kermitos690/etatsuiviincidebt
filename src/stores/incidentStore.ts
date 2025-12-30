import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Incident, FilterState, AppConfig, Proof } from '@/types/incident';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_INSTITUTIONS,
  DEFAULT_TYPES,
  DEFAULT_STATUTS,
  DEFAULT_GRAVITES,
  POIDS_GRAVITE,
  POIDS_TYPE,
  calculateScore,
  getPriorityFromScore,
} from '@/config/appConfig';
import { mapDbToIncident, mapIncidentToDb } from '@/mappers/incidents';

// ============= Types =============
interface IncidentStore {
  incidents: Incident[];
  filters: FilterState;
  config: AppConfig;
  isLoading: boolean;

  // Actions
  setIncidents: (incidents: Incident[]) => void;
  addIncident: (incident: Omit<Incident, 'id' | 'numero' | 'priorite' | 'score' | 'dateCreation'>) => Promise<Incident | null>;
  updateIncident: (id: string, updates: Partial<Incident>) => Promise<boolean>;
  deleteIncident: (id: string) => Promise<boolean>;

  // Filters
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;

  // Config
  updateConfig: (updates: Partial<AppConfig>) => void;

  // Load
  loadFromSupabase: () => Promise<void>;

  // Utils
  refreshScores: () => void;
  getNextNumero: () => number;
  getIncidentById: (id: string) => Incident | undefined;
  getIncidentsByStatus: (status: string) => Incident[];
  getIncidentsByPriority: (priority: string) => Incident[];
}

// ============= Helpers =============

// ============= Store =============
export const useIncidentStore = create<IncidentStore>()(
  persist(
    (set, get) => ({
      incidents: [],
      filters: {
        institution: 'all',
        type: 'all',
        gravite: 'all',
        statut: 'all',
        priorite: 'all',
        search: '',
        dateRange: null,
        transmisJP: 'all',
      },
      config: {
        institutions: DEFAULT_INSTITUTIONS,
        types: DEFAULT_TYPES,
        statuts: DEFAULT_STATUTS,
        gravites: DEFAULT_GRAVITES,
        poidsGravite: POIDS_GRAVITE,
        poidsType: POIDS_TYPE,
      },
      isLoading: false,

      setIncidents: (incidents) => set({ incidents }),

      loadFromSupabase: async () => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase
            .from('incidents')
            .select('*')
            .order('numero', { ascending: false });

          if (error) throw error;

          const incidents = (data || []).map(mapDbToIncident);
          set({ incidents });
        } catch (err) {
          console.error('Erreur chargement incidents:', err);
        } finally {
          set({ isLoading: false });
        }
      },

      addIncident: async (incident) => {
        try {
          const numero = get().getNextNumero();
          const dateCreation = new Date().toISOString();

          // Score & priorité
          const score = calculateScore(
            incident.gravite,
            incident.type,
            get().config.poidsGravite,
            get().config.poidsType
          );
          const priorite = getPriorityFromScore(score);

          const insertData = {
            numero,
            date_creation: dateCreation,
            date_incident: incident.dateIncident,
            institution: incident.institution,
            titre: incident.titre,
            faits: incident.faits,
            dysfonctionnement: incident.dysfonctionnement,
            type: incident.type,
            gravite: incident.gravite,
            statut: incident.statut,
            priorite,
            score,
            transmis_jp: incident.transmisJP,
            date_transmission_jp: incident.dateTransmissionJP || null,
            preuves: (incident.preuves as unknown as any) || ([] as Proof[]),
          };

          const { data, error } = await supabase
            .from('incidents')
            .insert(insertData)
            .select()
            .single();

          if (error) throw error;

          const created = mapDbToIncident(data);
          set({ incidents: [created, ...get().incidents] });

          return created;
        } catch (err) {
          console.error('Erreur ajout incident:', err);
          return null;
        }
      },

      updateIncident: async (id, updates) => {
        try {
          // Recalcule score/priorité si gravité/type changent
          let computed = { ...updates };

          if (updates.gravite || updates.type) {
            const current = get().incidents.find((i) => i.id === id);
            const gravite = updates.gravite ?? current?.gravite;
            const type = updates.type ?? current?.type;

            if (gravite && type) {
              const score = calculateScore(
                gravite,
                type,
                get().config.poidsGravite,
                get().config.poidsType
              );
              const priorite = getPriorityFromScore(score);
              computed = { ...computed, score, priorite };
            }
          }

          const dbPatch = mapIncidentToDb(computed);

          const { error } = await supabase
            .from('incidents')
            .update(dbPatch)
            .eq('id', id);

          if (error) throw error;

          set({
            incidents: get().incidents.map((inc) =>
              inc.id === id ? { ...inc, ...computed } : inc
            ),
          });

          return true;
        } catch (err) {
          console.error('Erreur update incident:', err);
          return false;
        }
      },

      deleteIncident: async (id) => {
        try {
          const { error } = await supabase.from('incidents').delete().eq('id', id);
          if (error) throw error;

          set({ incidents: get().incidents.filter((i) => i.id !== id) });
          return true;
        } catch (err) {
          console.error('Erreur delete incident:', err);
          return false;
        }
      },

      setFilters: (filters) =>
        set({
          filters: { ...get().filters, ...filters },
        }),

      resetFilters: () =>
        set({
          filters: {
            institution: 'all',
            type: 'all',
            gravite: 'all',
            statut: 'all',
            priorite: 'all',
            search: '',
            dateRange: null,
            transmisJP: 'all',
          },
        }),

      updateConfig: (updates) =>
        set({
          config: { ...get().config, ...updates },
        }),

      refreshScores: () => {
        const updated = get().incidents.map((inc) => {
          const score = calculateScore(
            inc.gravite,
            inc.type,
            get().config.poidsGravite,
            get().config.poidsType
          );
          const priorite = getPriorityFromScore(score);
          return { ...inc, score, priorite };
        });
        set({ incidents: updated });
      },

      getNextNumero: () => {
        const max = get().incidents.reduce((acc, inc) => Math.max(acc, inc.numero), 0);
        return max + 1;
      },

      getIncidentById: (id) => get().incidents.find((i) => i.id === id),

      getIncidentsByStatus: (status) =>
        get().incidents.filter((i) => i.statut === status),

      getIncidentsByPriority: (priority) =>
        get().incidents.filter((i) => i.priorite === priority),
    }),
    {
      name: 'incident-store',
      partialize: (state) => ({
        incidents: state.incidents,
        filters: state.filters,
        config: state.config,
      }),
    }
  )
);