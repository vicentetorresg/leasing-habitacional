-- Reemplazar cron jobs para usar URLs directas (sin vault)
select cron.unschedule('daily-advisor-digest') where exists (
  select 1 from cron.job where jobname = 'daily-advisor-digest'
);
select cron.unschedule('daily-executive-digest') where exists (
  select 1 from cron.job where jobname = 'daily-executive-digest'
);

select cron.schedule(
  'daily-advisor-digest',
  '0 12 * * *',
  $$
  select net.http_post(
    url := 'https://bzmzuoxapedvxmqcnhqq.supabase.co/functions/v1/daily-advisor-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bXp1b3hhcGVkdnhtcWNuaHFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIxNDM3NSwiZXhwIjoyMDkwNzkwMzc1fQ.PSxmllwNWogKtqYUdlBbxAnPiJzt4aya-Wr9vTuSPpM'
    ),
    body := '{}'::jsonb
  ) as request_id
  $$
);

select cron.schedule(
  'daily-executive-digest',
  '0 12 * * *',
  $$
  select net.http_post(
    url := 'https://bzmzuoxapedvxmqcnhqq.supabase.co/functions/v1/daily-executive-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bXp1b3hhcGVkdnhtcWNuaHFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIxNDM3NSwiZXhwIjoyMDkwNzkwMzc1fQ.PSxmllwNWogKtqYUdlBbxAnPiJzt4aya-Wr9vTuSPpM'
    ),
    body := '{}'::jsonb
  ) as request_id
  $$
);
