-- Add 'analyzing' status to sync_status
ALTER TABLE public.sync_status DROP CONSTRAINT IF EXISTS sync_status_status_check;
ALTER TABLE public.sync_status ADD CONSTRAINT sync_status_status_check 
  CHECK (status IN ('processing', 'analyzing', 'completed', 'error'));