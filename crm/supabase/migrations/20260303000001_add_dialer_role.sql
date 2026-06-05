-- Add 'dialer' role for users who only need to make manual calls
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dialer';
