-- Optional custom mane & tail colour (null = automatic derivation from coat colour)
alter table animals add column if not exists azulejo_mane_ink text;

notify pgrst, 'reload schema';
