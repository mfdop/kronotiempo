-- Bisabuelos: external great-grandparent names, used only when the parent is NOT an
-- animal in the app (otherwise they are read from the parent/grandparent records).
-- Keys: sire_gs_s, sire_gs_d, sire_gd_s, sire_gd_d, dam_gs_s, dam_gs_d, dam_gd_s, dam_gd_d
alter table animals add column if not exists ggp_external_names jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
