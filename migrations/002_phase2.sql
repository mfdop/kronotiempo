-- Phase 2 migration. Idempotent: safe to run more than once.
-- Run in the Supabase SQL editor (after supabase_schema.sql + supabase_patch_grandparents.sql).

-- ── 9. Meadows without water point ───────────────────────────
alter table meadows add column if not exists has_water boolean not null default true;

-- ── 11. Herrado: only completo / recorte / perdida ───────────
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.shoeing_records'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%type%'
  loop
    execute format('alter table public.shoeing_records drop constraint %I', r.conname);
  end loop;
end $$;

update shoeing_records set type = 'completo' where type in ('reherrado', 'correctivo');
update shoeing_records set type = 'recorte'  where type = 'descalzo';

alter table shoeing_records
  add constraint shoeing_records_type_check check (type in ('completo','recorte','perdida'));

-- ── 12. Up to 5 semen shipping attempts ──────────────────────
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.semen_shippings'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%attempt_number%'
  loop
    execute format('alter table public.semen_shippings drop constraint %I', r.conname);
  end loop;
end $$;

alter table semen_shippings
  add constraint semen_shippings_attempt_number_check check (attempt_number in (1,2,3,4,5));

-- Needed for the upsert (onConflict 'semen_sale_id,attempt_number') used by the app.
-- The schema already declares unique (semen_sale_id, attempt_number); this guards older DBs.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.semen_shippings'::regclass and contype = 'u'
  ) then
    alter table semen_shippings
      add constraint semen_shippings_sale_attempt_key unique (semen_sale_id, attempt_number);
  end if;
end $$;

-- ── 13. Extra mare data on semen sales ───────────────────────
alter table semen_sales add column if not exists mare_birth_date date;
alter table semen_sales add column if not exists mare_chip       text;
alter table semen_sales add column if not exists mare_ueln       text;

-- ── 14. Genetics: PATN1 ──────────────────────────────────────
alter table animal_genetics add column if not exists appaloosa text;  -- used by the app (see patch file)
alter table animal_genetics add column if not exists patn1     text;

-- ── 15. DNI ──────────────────────────────────────────────────
alter table clients add column if not exists dni text;
alter table animals add column if not exists custody_owner_dni text;

-- ── Phase 1 leftovers (cleanup / catalogue) ──────────────────
-- Water/food auto tasks are no longer generated: remove the old ones.
delete from tasks where origin in ('auto_agua', 'auto_comida');

-- Breeds catalogue (unused by the UI, kept consistent). Existing animals keep their breed text.
delete from breeds where name = 'PRD';
insert into breeds (name) values
  ('Hispanoárabe'),('Trakehner'),('Knabstrupper'),('Centroeuropeo'),('Cruzado'),('3 Sangres')
on conflict (name) do nothing;

notify pgrst, 'reload schema';
