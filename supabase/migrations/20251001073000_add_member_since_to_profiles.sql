ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS member_since date;

UPDATE profiles
SET member_since = created_at::date
WHERE member_since IS NULL;

ALTER TABLE profiles
ALTER COLUMN member_since SET DEFAULT now()::date;
