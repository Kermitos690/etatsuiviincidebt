-- Add validation columns to incidents table
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS validated_by TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;