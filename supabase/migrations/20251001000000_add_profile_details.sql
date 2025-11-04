ALTER TABLE public.profiles
  ADD COLUMN member_number TEXT,
  ADD COLUMN street TEXT,
  ADD COLUMN postal_code TEXT,
  ADD COLUMN city TEXT,
  ADD COLUMN mobile TEXT,
  ADD COLUMN birthday DATE,
  ADD COLUMN photo_url TEXT;
