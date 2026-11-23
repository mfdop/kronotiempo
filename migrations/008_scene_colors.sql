-- Per-horse scene colours (null = default green tones)
alter table animals add column if not exists azulejo_ground_ink text;
alter table animals add column if not exists azulejo_circle_ink text;

notify pgrst, 'reload schema';
