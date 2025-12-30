import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseStatus } from '@/components/common/SupabaseStatusBanner';

interface UseSupabaseQueryOptions<T> {
  queryFn: () => Promise<{ data: T | null; error: any }>;
  enabled?: boolean;
  refetchOnMount?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseSupabaseQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isConfigured: boolean;
}

/**
 * Safe Supabase query hook with error handling
 * Prevents crashes when Supabase is not configured
 */
export function useSupabaseQuery<T>({
  queryFn,
  enabled = true,
  refetchOnMount = true,
  onSuccess,
  onError,
}: UseSupabaseQueryOptions<T>): UseSupabaseQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { isConfigured } = useSupabaseStatus();
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!isConfigured || !enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      
      if (!mountedRef.current) return;

      if (result.error) {
        const err = new Error(result.error.message || 'Erreur de requête');
        setError(err);
        onError?.(err);
      } else {
        setData(result.data);
        onSuccess?.(result.data as T);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const error = err instanceof Error ? err : new Error('Erreur inconnue');
      setError(error);
      onError?.(error);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [queryFn, enabled, isConfigured, onSuccess, onError]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (refetchOnMount && enabled && isConfigured) {
      fetchData();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [fetchData, refetchOnMount, enabled, isConfigured]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    isConfigured,
  };
}

/**
 * Safe realtime subscription hook with throttling
 */
export function useRealtimeSubscription<T>({
  table,
  schema = 'public',
  event = '*',
  onInsert,
  onUpdate,
  onDelete,
  throttleMs = 500,
}: {
  table: string;
  schema?: string;
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T) => void;
  onDelete?: (payload: { id: string }) => void;
  throttleMs?: number;
}) {
  const { isConfigured } = useSupabaseStatus();
  const lastEventRef = useRef<number>(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!isConfigured) return;

    const handleChange = (payload: any) => {
      const now = Date.now();
      if (now - lastEventRef.current < throttleMs) {
        return; // Throttle rapid events
      }
      lastEventRef.current = now;

      try {
        if (payload.eventType === 'INSERT' && onInsert) {
          onInsert(payload.new as T);
        } else if (payload.eventType === 'UPDATE' && onUpdate) {
          onUpdate(payload.new as T);
        } else if (payload.eventType === 'DELETE' && onDelete) {
          onDelete({ id: payload.old?.id });
        }
      } catch (err) {
        console.error('Realtime handler error:', err);
      }
    };

    const channel = supabase.channel(`${table}-realtime-${Date.now()}`);
    
    channelRef.current = channel
      .on(
        'postgres_changes' as any,
        { event, schema, table },
        handleChange
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [isConfigured, table, schema, event, onInsert, onUpdate, onDelete, throttleMs]);
}
