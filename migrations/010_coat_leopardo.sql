-- 010_coat_leopardo.sql
-- Adds the 'leopardo' coat pattern (Appaloosa leopardo: spots over the whole body).
-- 'appaloosa' keeps its meaning (Appaloosa manta / blanket) for backward compatibility.
-- Idempotent: safe to run more than once.

do $$
declare
  c record;
begin
  -- drop every existing CHECK constraint that references animals.coat_pattern
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel      on rel.oid = con.conrelid
    join pg_namespace nsp  on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'animals'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%coat_pattern%'
  loop
    execute format('alter table public.animals drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.animals
  add constraint animals_coat_pattern_check
  check (coat_pattern in ('lisa','pio','appaloosa','leopardo'));

notify pgrst, 'reload schema';
