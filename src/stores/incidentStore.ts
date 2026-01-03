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
  getPriorityFromScore
} from '@/config/appConfig';
import { 
  mapDbToIncident, 
  mapIncidentToDb, 
  validateIncident, 
  calculateIncidentMetrics,
  canModifyIncident 
} from '@/mappers/incidents';
import { logIncidentCreation, logIncidentUpdate, logIncidentTransmission, logIncidentLock } from '@/hooks/useIncidentEvents';
import { sendIncidentPdfByEmail } from '@/services/sendIncidentPdf';

// ============= Types =============
interface IncidentStore {
  incidents: Incident[];
  filters: FilterState;
  config: AppConfig;
  isLoading: boolean;
  
  // Actions
  setIncidents: (incidents: Incident[]) => void;
  addIncident: (incident: Omit<Incident, 'id' | 'numero' | 'score' | 'priorite' | 'dateCreation'>) => Promise<Incident | null>;
  updateIncident: (id: string, updates: Partial<Incident>, modificationReason?: string) => Promise<{ success: boolean; error?: string }>;
  deleteIncident: (id: string) => Promise<void>;
  markTransmisJP: (id: string) => Promise<{ success: boolean; error?: string; emailError?: string }>;
  lockIncident: (id: string, lock: boolean, reason?: string) => Promise<{ success: boolean; error?: string }>;
  resendPdf: (id: string) => Promise<{ success: boolean; error?: string }>;
  setFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;
  updateConfig: (config: Partial<AppConfig>) => void;
  loadFromSupabase: () => Promise<void>;
  
  // Computed
  getFilteredIncidents: () => Incident[];
  getNextNumero: () => number;
  getIncidentById: (id: string) => Incident | undefined;
  getIncidentsByStatus: (status: string) => Incident[];
  getIncidentsByPriority: (priority: string) => Incident[];
}

// Use centralized mappers from src/mappers/incidents.ts
// Local mapping functions removed to prevent duplication

// ============= Store =============
export const useIncidentStore = create<IncidentStore>()(
  persist(
    (set, get) => ({
      incidents: [],
      filters: {},
      isLoading: false,
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

      loadFromSupabase: async () => {
        set({ isLoading: true });
        try {
        const { data, error } = await supabase
          .from('incidents')
          .select('*')
          .order('date_incident', { ascending: false });

          if (error) {
            console.error('Error loading incidents:', error);
            return;
          }

          if (data) {
            set({ incidents: data.map(mapDbToIncident) });
          }
        } catch (error) {
          console.error('Error loading incidents:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      addIncident: async (incidentData) => {
        const state = get();
        const score = calculateScore(
          incidentData.gravite,
          incidentData.type,
          incidentData.transmisJP,
          state.config.poidsGravite,
          state.config.poidsType
        );
        const priorite = getPriorityFromScore(score);

        const { data, error } = await supabase
          .from('incidents')
          .insert({
            date_incident: incidentData.dateIncident,
            institution: incidentData.institution,
            type: incidentData.type,
            gravite: incidentData.gravite,
            statut: incidentData.statut,
            titre: incidentData.titre,
            faits: incidentData.faits,
            dysfonctionnement: incidentData.dysfonctionnement,
            transmis_jp: incidentData.transmisJP,
            date_transmission_jp: incidentData.dateTransmissionJP || null,
            preuves: incidentData.preuves as unknown as any,
            score,
            priorite
          })
          .select()
          .single();

        if (error) {
          console.error('Error adding incident:', error);
          return null;
        }

        const newIncident = mapDbToIncident(data);
        set({ incidents: [...state.incidents, newIncident] });
        return newIncident;
      },

      updateIncident: async (id, updates, modificationReason) => {
        const state = get();
        
        const existingIncident = state.incidents.find(inc => inc.id === id);
        if (!existingIncident) {
          return { success: false, error: 'Incident non trouvé' };
        }

        // Check if incident can be modified
        const { canModify, reason } = canModifyIncident(existingIncident);
        if (!canModify) {
          return { success: false, error: reason };
        }

        let finalUpdates = { ...updates };
        
        // Add modification reason if provided
        if (modificationReason) {
          finalUpdates.modificationReason = modificationReason;
        }

        // Recalculate score if needed
        if (updates.gravite || updates.type || updates.transmisJP !== undefined) {
          const newScore = calculateScore(
            updates.gravite || existingIncident.gravite,
            updates.type || existingIncident.type,
            updates.transmisJP ?? existingIncident.transmisJP,
            state.config.poidsGravite,
            state.config.poidsType
          );
          finalUpdates.score = newScore;
          finalUpdates.priorite = getPriorityFromScore(newScore);
        }

        const { error } = await supabase
          .from('incidents')
          .update(mapIncidentToDb(finalUpdates))
          .eq('id', id);

        if (error) {
          console.error('Error updating incident:', error);
          return { success: false, error: 'Erreur lors de la mise à jour' };
        }

        // Log the update event
        await logIncidentUpdate(id, existingIncident.numero, existingIncident, finalUpdates, modificationReason);

        set({
          incidents: state.incidents.map((inc) => 
            inc.id === id ? { ...inc, ...finalUpdates } : inc
          )
        });

        return { success: true };
      },

      markTransmisJP: async (id) => {
        const state = get();
        const existingIncident = state.incidents.find(inc => inc.id === id);
        if (!existingIncident) {
          return { success: false, error: 'Incident non trouvé' };
        }

        const updates = {
          transmisJP: true,
          dateTransmissionJP: new Date().toISOString(),
          statut: 'Transmis',
          isLocked: true, // Auto-lock when transmitted
        };

        // 1. Update DB first
        const { error } = await supabase
          .from('incidents')
          .update(mapIncidentToDb(updates as any))
          .eq('id', id);

        if (error) {
          console.error('Error marking transmis JP:', error);
          return { success: false, error: 'Erreur lors de la transmission' };
        }

        // 2. Log transmission event (non-blocking)
        logIncidentTransmission(id, existingIncident.numero).catch(console.error);

        // 3. Update local state with new values
        const updatedIncident = { ...existingIncident, ...updates };
        set({
          incidents: state.incidents.map((inc) => 
            inc.id === id ? updatedIncident : inc
          )
        });

        // 4. Generate PDF and send email (non-blocking)
        let emailError: string | undefined;
        try {
          const sendResult = await sendIncidentPdfByEmail(updatedIncident);
          if (!sendResult.success) {
            emailError = sendResult.error;
            console.error('Email send failed:', sendResult.error);
          }
        } catch (e: any) {
          emailError = e.message || 'Erreur lors de l\'envoi email';
          console.error('Email send error:', e);
        }

        // Transmission is always successful even if email fails
        return { success: true, emailError };
      },

      resendPdf: async (id) => {
        const state = get();
        const incident = state.incidents.find(inc => inc.id === id);
        if (!incident) {
          return { success: false, error: 'Incident non trouvé' };
        }

        try {
          const sendResult = await sendIncidentPdfByEmail(incident);
          return sendResult;
        } catch (e: any) {
          return { success: false, error: e.message || 'Erreur lors de l\'envoi' };
        }
      },

      lockIncident: async (id, lock, reason) => {
        const state = get();
        const existingIncident = state.incidents.find(inc => inc.id === id);
        if (!existingIncident) {
          return { success: false, error: 'Incident non trouvé' };
        }

        const { error } = await supabase
          .from('incidents')
          .update({ is_locked: lock })
          .eq('id', id);

        if (error) {
          console.error('Error locking incident:', error);
          return { success: false, error: 'Erreur lors du verrouillage' };
        }

        // Log lock/unlock event
        await logIncidentLock(id, existingIncident.numero, lock, reason);

        set({
          incidents: state.incidents.map((inc) => 
            inc.id === id ? { ...inc, isLocked: lock } : inc
          )
        });

        return { success: true };
      },

      deleteIncident: async (id) => {
        const { error } = await supabase
          .from('incidents')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting incident:', error);
          return;
        }

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
      },

      getIncidentById: (id) => {
        return get().incidents.find((inc) => inc.id === id);
      },

      getIncidentsByStatus: (status) => {
        return get().incidents.filter((inc) => inc.statut === status);
      },

      getIncidentsByPriority: (priority) => {
        return get().incidents.filter((inc) => inc.priorite === priority);
      }
    }),
    {
      name: 'incident-store'
    }
  )
);
