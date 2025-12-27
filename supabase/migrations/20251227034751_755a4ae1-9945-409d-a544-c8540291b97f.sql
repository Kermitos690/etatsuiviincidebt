-- Fix user_owns_email function to remove NULL user_id bypass
CREATE OR REPLACE FUNCTION public.user_owns_email(_email_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.emails
    WHERE id = _email_id AND user_id = auth.uid()
  )
$$;