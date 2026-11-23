-- Daily push digest schedule. Idempotent.
-- BEFORE RUNNING replace:
--   <PROJECT_REF>  -> your Supabase project ref (the xxxx in https://xxxx.supabase.co)
--   <CRON_SECRET>  -> the same value you set as the CRON_SECRET function secret
-- pg_cron uses UTC: 07:00 UTC = 08:00 Madrid in winter (CET) / 09:00 in summer (CEST).

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'send-reminders-daily') then
    perform cron.unschedule('send-reminders-daily');
  end if;
end $$;

select cron.schedule(
  'send-reminders-daily',
  '0 7 * * *',
  $cron$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body    := '{}'::jsonb
  );
  $cron$
);

notify pgrst, 'reload schema';
