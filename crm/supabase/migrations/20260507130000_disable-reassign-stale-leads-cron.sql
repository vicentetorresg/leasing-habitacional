-- Deshabilitar el cron de reasignación de leads antiguos a Camila
select cron.unschedule('reassign-stale-leads') where exists (
  select 1 from cron.job where jobname = 'reassign-stale-leads'
);
