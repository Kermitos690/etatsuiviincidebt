-- Backfill missing profiles for existing users
INSERT INTO public.profiles (id, email, display_name)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Backfill missing user_roles for existing users
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id,
  'user'::app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;