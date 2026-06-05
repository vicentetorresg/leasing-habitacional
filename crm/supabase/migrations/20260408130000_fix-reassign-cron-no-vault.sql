-- Fix: reemplazar vault secrets por valores hardcodeados (vault no está configurado)
-- 0 12 * * * = 8:00 AM Santiago (UTC-4, horario invierno Chile)

select cron.unschedule('reassign-stale-leads');

select cron.schedule(
  'reassign-stale-leads',
  '0 12 * * *',
  $$
  select net.http_post(
    url := 'https://bzmzuoxapedvxmqcnhqq.supabase.co/functions/v1/reassign-stale-leads',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bXp1b3hhcGVkdnhtcWNuaHFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIxNDM3NSwiZXhwIjoyMDkwNzkwMzc1fQ.PSxmllwNWogKtqYUdlBbxAnPiJzt4aya-Wr9vTuSPpM'
    ),
    body := '{}'::jsonb
  ) as request_id
  $$
);
