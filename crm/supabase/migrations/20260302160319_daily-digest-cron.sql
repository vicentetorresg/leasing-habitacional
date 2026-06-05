-- Enable pg_cron and pg_net if not already enabled
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove old schedules if they exist
select cron.unschedule('daily-advisor-digest') where exists (
  select 1 from cron.job where jobname = 'daily-advisor-digest'
);
select cron.unschedule('daily-executive-digest') where exists (
  select 1 from cron.job where jobname = 'daily-executive-digest'
);

-- Daily advisor digest at 9:00 AM Chile time (UTC-3 = 12:00 UTC)
select cron.schedule(
  'daily-advisor-digest',
  '0 12 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url') || '/functions/v1/daily-advisor-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id
  $$
);

-- Daily executive digest at 9:00 AM Chile time (UTC-3 = 12:00 UTC)
select cron.schedule(
  'daily-executive-digest',
  '0 12 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url') || '/functions/v1/daily-executive-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id
  $$
);
