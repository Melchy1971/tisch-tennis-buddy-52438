-- Add default_role column to profiles for members without user_id
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_role text;

-- Update existing profiles without user_id to have default_role 'player'
UPDATE profiles 
SET default_role = 'player' 
WHERE user_id IS NULL AND deleted_at IS NULL AND default_role IS NULL;