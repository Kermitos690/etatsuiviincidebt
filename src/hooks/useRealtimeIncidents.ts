import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIncidentStore } from '@/stores/incidentStore';

/**
 * Version SAFE (objectif: remettre l'app en marche)
 * - Realtime: écoute incidents
 * - À chaque event: recharge depuis Supabase
 * - Pas de types fragiles, pas de logique complexe
 */
export function useRealtimeIncidents() {
  const { loadFromSupabase } = useIncidentStore();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // Chargement initial
    loadFromSupabase().catch((err) => {
      console.error('Initial load incidents failed:', err);
    });

    // Nettoyage ancien canal
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Abonnement realtime
    const channel = supabase
      .channel('realtime:incidents')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        () => {
          loadFromSupabase().catch((err) => {
            console.error('Realtime reload incidents failed:', err);
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [loadFromSupabase]);
}