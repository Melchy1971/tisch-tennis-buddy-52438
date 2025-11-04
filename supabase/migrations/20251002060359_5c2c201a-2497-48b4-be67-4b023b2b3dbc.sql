-- Fix critical security issue: Remove overly permissive policy
-- This policy allows any authenticated user to view ALL member profiles
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Note: The correct restrictive policies already exist:
-- 1. "Users can view own profile" - allows users to view only their own profile
-- 2. "Admins and vorstand can view all profiles" - allows admins/vorstand to manage users