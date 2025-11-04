-- Assign admin role to Markus Dickscheit
-- First, remove any existing roles for this user
DELETE FROM public.user_roles 
WHERE user_id = 'a029012f-2123-40f9-963c-e790b12b86a1';

-- Then insert admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('a029012f-2123-40f9-963c-e790b12b86a1', 'admin');