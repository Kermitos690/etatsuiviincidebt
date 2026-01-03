-- Add admin role to the existing user (teba.gaetan@gmail.com)
INSERT INTO public.user_roles (user_id, role)
VALUES ('d866baf5-9d64-40e1-a692-d65451b49451', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;