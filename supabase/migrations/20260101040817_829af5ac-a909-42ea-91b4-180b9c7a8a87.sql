-- Fix RLS policy for detection_patterns to remove NULL bypass
DROP POLICY IF EXISTS "Users can view own detection_patterns" ON public.detection_patterns;

CREATE POLICY "Users can view own detection_patterns" 
ON public.detection_patterns 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());