-- Web Push subscriptions. Idempotent: safe to run more than once.
create table if not exists push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint        text not null unique,
  p256dh          text not null,
  auth            text not null,
  user_agent      text,
  created_at      timestamptz default now(),
  last_success_at timestamptz
);

create index if not exists push_subscriptions_owner_idx on push_subscriptions (owner_id);

alter table push_subscriptions enable row level security;

drop policy if exists "push_subscriptions: owner full access" on push_subscriptions;
create policy "push_subscriptions: owner full access" on push_subscriptions
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert, update, delete on push_subscriptions to authenticated;

notify pgrst, 'reload schema';
