-- Fix hora cron: Chile invierno es UTC-4, así que 8 AM Santiago = 12:00 UTC
-- Anterior estaba en 11:00 UTC (correcto solo en horario de verano UTC-3)

select cron.unschedule('reassign-stale-leads');

select cron.schedule(
  'reassign-stale-leads',
  '0 12 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url') || '/functions/v1/reassign-stale-leads',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id
  $$
);
