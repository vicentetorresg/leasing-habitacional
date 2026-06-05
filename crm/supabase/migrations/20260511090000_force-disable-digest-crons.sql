-- Force disable daily digest cron jobs
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN ('daily-advisor-digest', 'daily-executive-digest');
