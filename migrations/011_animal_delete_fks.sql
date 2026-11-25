-- 011: make deleting an animal possible.
-- Self/other references to animals(id) had no ON DELETE behaviour (NO ACTION),
-- so deleting a horse that is a parent, pregnancy sire/foal or has tasks failed with 23503.
do $$
declare
  spec record;
  con  record;
begin
  for spec in
    select * from (values
      ('animals',     'sire_id',   'set null'),
      ('animals',     'dam_id',    'set null'),
      ('pregnancies', 'sire_id',   'set null'),
      ('pregnancies', 'foal_id',   'set null'),
      ('tasks',       'animal_id', 'cascade')
    ) as t(tbl, col, action)
  loop
    -- drop every FK on this column pointing at animals, whatever its name
    for con in
      select c.conname
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
      where c.contype = 'f'
        and c.conrelid = format('public.%I', spec.tbl)::regclass
        and c.confrelid = 'public.animals'::regclass
        and a.attname = spec.col
    loop
      execute format('alter table public.%I drop constraint %I', spec.tbl, con.conname);
    end loop;

    execute format(
      'alter table public.%I add constraint %I foreign key (%I) references public.animals(id) on delete %s',
      spec.tbl, spec.tbl || '_' || spec.col || '_fkey', spec.col, spec.action);
  end loop;
end $$;

notify pgrst, 'reload schema';
