-- Cron diario: reasignar leads de Susan en first_call con más de 6 días a Camila
-- Se ejecuta a las 08:00 Chile (UTC-3 = 11:00 UTC)

select cron.unschedule('reassign-stale-leads') where exists (
  select 1 from cron.job where jobname = 'reassign-stale-leads'
);

select cron.schedule(
  'reassign-stale-leads',
  '0 11 * * *',
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
