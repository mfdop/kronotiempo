-- Run AFTER supabase_schema.sql.
-- Columns the app uses (src/types/index.ts) that are missing from supabase_schema.sql.
alter table animals add column if not exists sire_gs_external_name text;
alter table animals add column if not exists sire_gd_external_name text;
alter table animals add column if not exists dam_gs_external_name  text;
alter table animals add column if not exists dam_gd_external_name  text;
