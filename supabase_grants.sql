-- Fixes "permission denied for table ... [42501]".
-- Newer Supabase projects don't automatically grant API roles access to tables
-- created in the SQL editor. RLS policies still restrict rows to their owner.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Apply the same to tables created in the future
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;

notify pgrst, 'reload schema';
