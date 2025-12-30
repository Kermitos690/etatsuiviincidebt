import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIncidentStore } from '@/stores/incidentStore';

/**
 * Realtime incidents — stratégie robuste :
 * - On écoute les changements Postgres (INSERT/UPDATE/DELETE)
 * - On ne tente pas de "patcher" localement la liste (risque de conflits/écrasements)
 * - On recharge depuis Supabase, MAIS en throttlant (anti rafale d'events)
 *
 * Objectif :
 * - Stabilité visuelle
 * - Pas de doublons
 * - Pas de retours arrière
 * - Pas de 50 reloads en 2 secondes
 */
export function useRealtimeIncidents() {
  const { loadFromSupabase } = useIncidentStore();

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingReloadRef = useRef(false);

  // Throttle: au max 1 reload toutes les 500ms
  const queueReload = useCallback(() => {
    pendingReloadRef.current = true;

    if (reloadTimerRef.current) return;

    reloadTimerRef.current = setTimeout(async () => {
      reloadTimerRef.current = null;

      if (!pendingReloadRef.current) return;
      pendingReloadRef.current = false;

      try {
        await loadFromSupabase();
      } catch (err) {
        console.error('Realtime reload incidents failed:', err);
      }
    }, 500);
  }, [loadFromSupabase]);

  useEffect(() => {
    // 1) Premier chargement à l'activation du hook
    loadFromSupabase().catch((err) => {
      console.error('Initial load incidents failed:', err);
    });

    // 2) Nettoyage d’un ancien channel si présent
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // 3) Abonnement realtime
    const channel = supabase
      .channel('realtime:incidents')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        () => {
          // Peu importe l'event exact, on déclenche un reload "throttlé"
          queueReload();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      // Cleanup timer
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }

      // Cleanup channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [loadFromSupabase, queueReload]);
}