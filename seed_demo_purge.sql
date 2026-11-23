-- Removes everything created by seed_demo.sql (rows tagged '[DEMO]').
-- Children (shoeing, health, genetics, etc.) go with their animals via ON DELETE CASCADE.
-- Tasks (including ones the app auto-created for demo animals) and pregnancies that
-- reference demo animals have no cascade, so they are deleted explicitly first.
delete from tasks
  where animal_id in (select id from animals where private_notes = '[DEMO]');

delete from pregnancies
  where mare_id in (select id from animals where private_notes = '[DEMO]')
     or sire_id in (select id from animals where private_notes = '[DEMO]')
     or foal_id in (select id from animals where private_notes = '[DEMO]');

-- payments cascade from their sales (pregnancy_sales via pregnancies, semen_sales below).
delete from pregnancy_sales
  where client_id in (select id from clients where notes = '[DEMO]');
delete from semen_sales where notes = '[DEMO]';
delete from animals     where private_notes = '[DEMO]';
delete from meadows     where notes = '[DEMO]';
delete from clients     where notes = '[DEMO]';

-- Tasks the app auto-created for demo meadows (water/food) have no animal link;
-- they stay in the agenda until you complete or delete them there.
