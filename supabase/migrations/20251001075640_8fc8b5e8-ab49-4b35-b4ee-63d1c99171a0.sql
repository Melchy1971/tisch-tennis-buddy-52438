-- Assign all available roles to the admin user
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('a029012f-2123-40f9-963c-e790b12b86a1', 'admin'),
  ('a029012f-2123-40f9-963c-e790b12b86a1', 'moderator'),
  ('a029012f-2123-40f9-963c-e790b12b86a1', 'player'),
  ('a029012f-2123-40f9-963c-e790b12b86a1', 'substitute'),
  ('a029012f-2123-40f9-963c-e790b12b86a1', 'vorstand')
ON CONFLICT (user_id, role) DO NOTHING;