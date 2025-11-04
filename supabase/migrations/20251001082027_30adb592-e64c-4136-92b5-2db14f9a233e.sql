-- Add mannschaftsfuehrer role to app_role enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'mannschaftsfuehrer' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'mannschaftsfuehrer';
  END IF;
END $$;