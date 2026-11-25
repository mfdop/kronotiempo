-- Removes everything created by seed_demo.sql (rows tagged '[DEMO]').
-- Safe to run more than once. Your own (non-demo) animals, meadows and clients are kept;
-- links from them to demo rows are cleared first so the deletes are not blocked.

-- ── Demo animals ─────────────────────────────────────────────
-- Children (shoeing, health, genetics, docs, fees, history...) cascade with the animal.
delete from tasks
  where animal_id in (select id from animals where private_notes = '[DEMO]');

delete from pregnancies
  where mare_id in (select id from animals where private_notes = '[DEMO]')
     or sire_id in (select id from animals where private_notes = '[DEMO]')
     or foal_id in (select id from animals where private_notes = '[DEMO]');

-- Your own animals whose parent is a demo animal: keep the name, drop the link
update animals a set sire_external_name = coalesce(a.sire_external_name, d.name), sire_id = null
  from animals d where a.sire_id = d.id and d.private_notes = '[DEMO]' and a.private_notes is distinct from '[DEMO]';
update animals a set dam_external_name = coalesce(a.dam_external_name, d.name), dam_id = null
  from animals d where a.dam_id = d.id and d.private_notes = '[DEMO]' and a.private_notes is distinct from '[DEMO]';

-- ── Demo clients ─────────────────────────────────────────────
-- Payments cascade from their sales.
delete from pregnancy_sales where client_id in (select id from clients where notes = '[DEMO]');
delete from semen_sales     where notes = '[DEMO]'
                               or client_id in (select id from clients where notes = '[DEMO]');
update animals set sold_client_id = null
  where sold_client_id in (select id from clients where notes = '[DEMO]');

delete from animals where private_notes = '[DEMO]';

-- ── Demo meadows ─────────────────────────────────────────────
-- Your own animals placed in a demo meadow are left without a meadow.
update animals set meadow_id = null
  where meadow_id in (select id from meadows where notes = '[DEMO]');
delete from animal_meadow_history
  where meadow_id in (select id from meadows where notes = '[DEMO]');
delete from meadows where notes = '[DEMO]';

delete from clients where notes = '[DEMO]';
