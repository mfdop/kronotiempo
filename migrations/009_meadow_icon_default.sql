-- 009: meadow icons are now SVG keys (pradera, arbol, cercado, ...) instead of emoji.
-- The column keeps its name (icon_emoji). Idempotent.
alter table meadows alter column icon_emoji set default 'pradera';

update meadows set icon_emoji = 'pradera' where icon_emoji = '🌿';
update meadows set icon_emoji = 'arbol'   where icon_emoji = '🌳';
update meadows set icon_emoji = 'cercado' where icon_emoji = '🐎';

notify pgrst, 'reload schema';
