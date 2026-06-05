
-- Add phone_e164 to profiles for ejecutiva's personal phone
ALTER TABLE public.profiles ADD COLUMN phone_e164 TEXT;

-- Add telephony provider columns to call_attempts
ALTER TABLE public.call_attempts ADD COLUMN provider TEXT DEFAULT 'telnyx';
ALTER TABLE public.call_attempts ADD COLUMN provider_call_sid_agent TEXT;
ALTER TABLE public.call_attempts ADD COLUMN provider_call_sid_lead TEXT;
