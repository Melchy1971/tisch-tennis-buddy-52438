-- Ensure that Markus Dickscheit has the admin role
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'
FROM public.profiles
WHERE first_name = 'Markus'
  AND last_name = 'Dickscheit'
ON CONFLICT (user_id, role) DO NOTHING;
