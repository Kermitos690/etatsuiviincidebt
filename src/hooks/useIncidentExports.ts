import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface IncidentExport {
  id: string;
  incident_id: string;
  file_name: string;
  storage_path: string;
  file_size_bytes: number | null;
  export_options: Record<string, boolean>;
  version: number;
  created_at: string;
}

export function useIncidentExports(incidentId: string | undefined) {
  const [exports, setExports] = useState<IncidentExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExports = useCallback(async () => {
    if (!incidentId) {
      setExports([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('incident_exports')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setExports((data || []) as IncidentExport[]);
    } catch (err) {
      console.error('Error fetching exports:', err);
      setError('Impossible de charger les exports');
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    fetchExports();
  }, [fetchExports]);

  const downloadExport = async (exportItem: IncidentExport) => {
    try {
      const { data, error: downloadError } = await supabase.storage
        .from('incident-exports')
        .download(exportItem.storage_path);

      if (downloadError) throw downloadError;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportItem.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Téléchargement de ${exportItem.file_name}`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const deleteExport = async (exportItem: IncidentExport) => {
    try {
      // Delete from storage
      await supabase.storage
        .from('incident-exports')
        .remove([exportItem.storage_path]);

      // Delete from database
      const { error: deleteError } = await supabase
        .from('incident_exports')
        .delete()
        .eq('id', exportItem.id);

      if (deleteError) throw deleteError;

      setExports(prev => prev.filter(e => e.id !== exportItem.id));
      toast.success('Export supprimé');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  return {
    exports,
    loading,
    error,
    refetch: fetchExports,
    downloadExport,
    deleteExport,
  };
}
