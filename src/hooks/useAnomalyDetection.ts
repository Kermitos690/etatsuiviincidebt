import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Anomaly {
  id: string;
  anomaly_type: string;
  severity: string;
  title: string;
  description: string;
  detected_at: string;
  related_email_ids: string[];
  pattern_data: Record<string, unknown>;
  baseline_data: Record<string, unknown>;
  deviation_score: number;
  confidence: number;
  status: string;
  ai_explanation: string;
  ai_recommendations: string[];
  time_window_start: string;
  time_window_end: string;
}

interface AnomalyStats {
  total: number;
  by_severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  by_type: {
    frequency_spike: number;
    timing_anomaly: number;
    sentiment_shift: number;
    behavior_change: number;
  };
  by_status: {
    new: number;
    investigating: number;
    confirmed: number;
    resolved: number;
    false_positive: number;
  };
}

export function useAnomalyDetection() {
  const queryClient = useQueryClient();
  const [isDetecting, setIsDetecting] = useState(false);

  // Fetch anomalies
  const { data: anomalies, isLoading: loadingAnomalies, refetch: refetchAnomalies } = useQuery({
    queryKey: ['anomalies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anomaly_detections')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as Anomaly[];
    }
  });

  // Fetch stats
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['anomaly-stats'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('detect-anomalies', {
        body: { action: 'get-stats' }
      });

      if (response.error) throw response.error;
      return response.data.stats as AnomalyStats;
    }
  });

  // Detect anomalies mutation
  const detectMutation = useMutation({
    mutationFn: async () => {
      setIsDetecting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('detect-anomalies', {
        body: { action: 'detect-all' }
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
      queryClient.invalidateQueries({ queryKey: ['anomaly-stats'] });
      
      if (data.anomalies_detected > 0) {
        toast.success(`${data.anomalies_detected} anomalies détectées`);
      } else {
        toast.info('Aucune nouvelle anomalie détectée');
      }
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
    onSettled: () => {
      setIsDetecting(false);
    }
  });

  // Update baselines mutation
  const updateBaselinesMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('detect-anomalies', {
        body: { action: 'update-baselines' }
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`${data.baselines_updated} baselines mises à jour`);
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  // Update anomaly status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updates: Record<string, unknown> = { status };
      
      if (status === 'investigating') {
        updates.investigated_at = new Date().toISOString();
      } else if (status === 'resolved' || status === 'false_positive') {
        updates.resolved_at = new Date().toISOString();
        if (notes) updates.resolution_notes = notes;
      }

      const { error } = await supabase
        .from('anomaly_detections')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
      queryClient.invalidateQueries({ queryKey: ['anomaly-stats'] });
      toast.success('Statut mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  return {
    anomalies: anomalies || [],
    stats,
    loadingAnomalies,
    loadingStats,
    isDetecting,
    detectAnomalies: detectMutation.mutate,
    updateBaselines: updateBaselinesMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    refetchAnomalies
  };
}
