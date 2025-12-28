import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIncidentStore } from '@/stores/incidentStore';
import type { Incident, Proof } from '@/types/incident';

const mapDbToIncident = (inc: any): Incident => ({
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

export function useRealtimeIncidents() {
  const { incidents, setIncidents, loadFromSupabase } = useIncidentStore();

  useEffect(() => {
    // Initial load
    loadFromSupabase();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('incidents-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incidents'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newIncident = mapDbToIncident(payload.new);
            setIncidents([...incidents, newIncident]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedIncident = mapDbToIncident(payload.new);
            setIncidents(
              incidents.map(inc => 
                inc.id === updatedIncident.id ? updatedIncident : inc
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setIncidents(
              incidents.filter(inc => inc.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Re-subscribe when incidents change to have fresh state in callback
  useEffect(() => {
    const channel = supabase
      .channel('incidents-realtime-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incidents'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newIncident = mapDbToIncident(payload.new);
            // Check if already exists to avoid duplicates
            const exists = incidents.some(inc => inc.id === newIncident.id);
            if (!exists) {
              setIncidents([...incidents, newIncident]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedIncident = mapDbToIncident(payload.new);
            setIncidents(
              incidents.map(inc => 
                inc.id === updatedIncident.id ? updatedIncident : inc
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setIncidents(
              incidents.filter(inc => inc.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [incidents, setIncidents]);
}
