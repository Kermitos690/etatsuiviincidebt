import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIncidentStore } from '@/stores/incidentStore';
import type { Incident, Proof } from '@/types/incident';
import { mapDbToIncident } from '@/mappers/incidents';

export function useRealtimeIncidents() {
  const { loadFromSupabase } = useIncidentStore();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const setupRealtime = useCallback(async () => {
    // Nettoie si déjà actif
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel('realtime:incidents')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload) => {
          try {
            // Stratégie simple & robuste : recharger depuis Supabase
            // (moins de risques d'incohérence sur mobile / rafales d'events)
            loadFromSupabase();
          } catch (err) {
            console.error('Erreur realtime incidents:', err);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [loadFromSupabase]);

  useEffect(() => {
    setupRealtime();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [setupRealtime]);
}

/**
 * (Conservé pour compatibilité de typage/imports ailleurs si besoin)
 * Note: le mapping réel est centralisé dans src/mappers/incidents.ts
 */
export const _mapDbToIncidentCompat = (inc: any): Incident => mapDbToIncident(inc);