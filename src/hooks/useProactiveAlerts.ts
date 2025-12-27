import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ProactiveAlert {
  id: string;
  user_id: string;
  alert_type: 'deadline' | 'anomaly' | 'contradiction' | 'template_abuse' | 'critical_situation' | string;
  priority: 'faible' | 'moyenne' | 'haute' | 'critique' | string;
  title: string;
  description?: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
  is_read: boolean;
  is_dismissed: boolean;
  due_date?: string;
  created_at: string;
  read_at?: string;
  dismissed_at?: string;
}

const PRIORITY_LABELS = {
  critique: '🔴 Critique',
  haute: '🟠 Haute',
  moyenne: '🟡 Moyenne',
  faible: '🟢 Faible',
};

export function useProactiveAlerts() {
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('proactive_alerts')
        .select('*')
        .eq('is_dismissed', false)
        .order('priority', { ascending: true }) // critique first
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const typedAlerts = (data || []) as unknown as ProactiveAlert[];
      setAlerts(typedAlerts);
      setUnreadCount(typedAlerts.filter(a => !a.is_read).length);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mark as read
  const markAsRead = useCallback(async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('proactive_alerts')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, is_read: true, read_at: new Date().toISOString() } : a
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = alerts.filter(a => !a.is_read).map(a => a.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('proactive_alerts')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) throw error;

      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [alerts]);

  // Dismiss alert
  const dismissAlert = useCallback(async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('proactive_alerts')
        .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    fetchAlerts();

    let channel: RealtimeChannel | null = null;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('proactive_alerts_realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'proactive_alerts',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newAlert = payload.new as unknown as ProactiveAlert;
            setAlerts(prev => [newAlert, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Show toast notification
            const priorityLabel = PRIORITY_LABELS[newAlert.priority as keyof typeof PRIORITY_LABELS] || newAlert.priority;
            toast.warning(`${priorityLabel}: ${newAlert.title}`, {
              description: newAlert.description,
              duration: 10000,
              action: {
                label: 'Voir',
                onClick: () => markAsRead(newAlert.id),
              },
            });
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchAlerts, markAsRead]);

  return {
    alerts,
    unreadCount,
    isLoading,
    fetchAlerts,
    markAsRead,
    markAllAsRead,
    dismissAlert,
  };
}
