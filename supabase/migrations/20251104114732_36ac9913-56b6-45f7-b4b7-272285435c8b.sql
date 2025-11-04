-- Extend app_role enum with all missing roles used in the application

-- First, check if roles exist and add them if missing
DO $$
BEGIN
  -- Add 'vorstand' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'vorstand' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'vorstand';
  END IF;
  
  -- Add 'mannschaftsfuehrer' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'mannschaftsfuehrer' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'mannschaftsfuehrer';
  END IF;
  
  -- Add 'player' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'player' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'player';
  END IF;
  
  -- Add 'mitglied' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'mitglied' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'mitglied';
  END IF;
  
  -- Add 'moderator' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'moderator' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'moderator';
  END IF;
  
  -- Add 'damen' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'damen' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'damen';
  END IF;
  
  -- Add 'senioren' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'senioren' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'senioren';
  END IF;
  
  -- Add 'jugend' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'jugend' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'jugend';
  END IF;
  
  -- Add 'volleyball' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'volleyball' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'volleyball';
  END IF;
  
  -- Add 'entwickler' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'entwickler' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'entwickler';
  END IF;
END$$;

-- Add missing columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT false;

-- Add missing column to club_settings table  
ALTER TABLE public.club_settings
  ADD COLUMN IF NOT EXISTS show_feedback_section BOOLEAN DEFAULT true;