-- Update profile name to Admin
UPDATE public.profiles
SET first_name = 'Admin',
    last_name = 'Admin',
    updated_at = now()
WHERE user_id = 'a029012f-2123-40f9-963c-e790b12b86a1';

-- Assign admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('a029012f-2123-40f9-963c-e790b12b86a1', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;