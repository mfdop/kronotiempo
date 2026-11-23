-- Phase 3 migration. Idempotent: safe to run more than once.
-- Run in the Supabase SQL editor (after 002_phase2.sql).
-- Destructive on purpose (demo data only): drops "Interesados" and the old
-- deposit/final/payment_status columns after copying their amounts to payments.

-- ── 16. Remove "Interesados" (pregnancy_interested) ──────────
-- The buyer is now a normal client attached via pregnancy_sales.
drop table if exists pregnancy_interested cascade;   -- also drops its policies

-- ── 17. Multi-installment payments ───────────────────────────
create table if not exists payments (
  id                 uuid primary key default uuid_generate_v4(),
  owner_id           uuid not null references auth.users(id) on delete cascade default auth.uid(),
  pregnancy_sale_id  uuid references pregnancy_sales(id) on delete cascade,
  semen_sale_id      uuid references semen_sales(id) on delete cascade,
  amount             numeric(10,2) not null check (amount > 0),
  paid_date          date not null default current_date,
  method             text,
  notes              text,
  created_at         timestamptz default now(),
  constraint payments_one_sale_check check (
    (pregnancy_sale_id is not null and semen_sale_id is null) or
    (pregnancy_sale_id is null and semen_sale_id is not null)
  )
);

create index if not exists payments_pregnancy_sale_idx on payments (pregnancy_sale_id);
create index if not exists payments_semen_sale_idx     on payments (semen_sale_id);

alter table payments enable row level security;

drop policy if exists "payments: owner full access" on payments;
create policy "payments: owner full access" on payments
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert, update, delete on payments to authenticated;

-- Copy existing deposit_amount / final_amount into payment rows, then drop the old columns.
-- Guarded so a second run (columns already gone) does nothing.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'pregnancy_sales' and column_name = 'deposit_amount') then
    insert into payments (owner_id, pregnancy_sale_id, amount, paid_date, notes)
    select a.owner_id, s.id, s.deposit_amount, s.created_at::date, 'Reserva (migrado)'
    from pregnancy_sales s
    join pregnancies p on p.id = s.pregnancy_id
    join animals a on a.id = p.mare_id
    where coalesce(s.deposit_amount, 0) > 0;

    insert into payments (owner_id, pregnancy_sale_id, amount, paid_date, notes)
    select a.owner_id, s.id, s.final_amount, s.created_at::date, 'Pago final (migrado)'
    from pregnancy_sales s
    join pregnancies p on p.id = s.pregnancy_id
    join animals a on a.id = p.mare_id
    where coalesce(s.final_amount, 0) > 0;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'semen_sales' and column_name = 'deposit_amount') then
    insert into payments (owner_id, semen_sale_id, amount, paid_date, notes)
    select a.owner_id, s.id, s.deposit_amount, s.created_at::date, 'Reserva (migrado)'
    from semen_sales s
    join animals a on a.id = s.stallion_id
    where coalesce(s.deposit_amount, 0) > 0;

    insert into payments (owner_id, semen_sale_id, amount, paid_date, notes)
    select a.owner_id, s.id, s.final_amount, s.created_at::date, 'Pago final (migrado)'
    from semen_sales s
    join animals a on a.id = s.stallion_id
    where coalesce(s.final_amount, 0) > 0;
  end if;
end $$;

alter table pregnancy_sales drop column if exists deposit_amount;
alter table pregnancy_sales drop column if exists final_amount;
alter table pregnancy_sales drop column if exists payment_status;
alter table semen_sales     drop column if exists deposit_amount;
alter table semen_sales     drop column if exists final_amount;
alter table semen_sales     drop column if exists payment_status;

notify pgrst, 'reload schema';
