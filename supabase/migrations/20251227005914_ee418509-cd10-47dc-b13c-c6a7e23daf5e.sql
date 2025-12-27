-- Fix overly permissive storage policy for email-attachments bucket
-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON storage.objects;

-- Create a more restrictive policy that checks email ownership
-- Users can only view attachments belonging to their emails
CREATE POLICY "Users can view own email attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'email-attachments' 
  AND (
    -- Extract email_id from storage path (format: {user_id}/{email_id}/filename)
    -- and check ownership via email_attachments table
    EXISTS (
      SELECT 1 FROM public.email_attachments ea
      JOIN public.emails e ON e.id = ea.email_id
      WHERE ea.storage_path = storage.objects.name
        AND e.user_id = auth.uid()
    )
  )
);