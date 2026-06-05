-- Disable daily digest cron jobs
select cron.unschedule('daily-advisor-digest') where exists (
  select 1 from cron.job where jobname = 'daily-advisor-digest'
);
select cron.unschedule('daily-executive-digest') where exists (
  select 1 from cron.job where jobname = 'daily-executive-digest'
);
