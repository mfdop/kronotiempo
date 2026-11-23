-- ═══════════════════════════════════════════════════════════
-- EQUIGEST PRO — Schema completo
-- Ejecutar en Supabase SQL Editor (en orden)
-- ═══════════════════════════════════════════════════════════

-- ── EXTENSIONES ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── BREEDS ───────────────────────────────────────────────────
create table breeds (
  id   uuid primary key default uuid_generate_v4(),
  name text not null unique
);
insert into breeds (name) values
  ('Appaloosa'),('PRE'),('PRD'),('Anglo-Árabe'),('Árabe'),
  ('Quarter Horse'),('Paint Horse'),('Lusitano'),('Hannoveriano'),
  ('Otra');

-- ── ANIMALS ──────────────────────────────────────────────────
create table animals (
  id                   uuid primary key default uuid_generate_v4(),
  owner_id             uuid not null references auth.users(id) on delete cascade,
  name                 text not null,
  alias                text,
  sex                  text not null check (sex in ('semental','yegua','potro','potra','castrado')),
  breed                text,
  status               text not null default 'activo'
                         check (status in ('activo','vendido','fallecido','cedido','custodia')),
  birth_date           date,
  registry_number      text,
  chip                 text,
  -- coat
  coat_base            text check (coat_base in ('negro','castano','alazan')),
  coat_pattern         text default 'lisa' check (coat_pattern in ('lisa','pio','appaloosa','leopardo')),
  coat_careto          boolean default false,
  coat_cuatroalbo      boolean default false,
  coat_description     text,
  -- azulejo
  azulejo_ink          text default '#4A2810',
  azulejo_bg           text default '#F0E4D4',
  -- genealogy
  sire_id              uuid references animals(id),
  sire_external_name   text,
  dam_id               uuid references animals(id),
  dam_external_name    text,
  -- location
  meadow_id            uuid,  -- FK added after meadows table
  -- economics
  purchase_price       numeric(10,2),
  purchase_date        date,
  purchase_origin      text,
  transport_cost       numeric(10,2),
  appraisal_value      numeric(10,2),
  sold_price           numeric(10,2),
  sold_date            date,
  sold_client_id       uuid,  -- FK added after clients table
  kept_after_sale      boolean default false,
  -- custody
  custody_owner_name   text,
  custody_owner_phone  text,
  -- misc
  ios_album            text,
  description          text,
  private_notes        text,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- ── MEADOWS / PARCELAS ───────────────────────────────────────
create table meadows (
  id             uuid primary key default uuid_generate_v4(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  surface_ha     numeric(8,2),
  cadastral_ref  text,
  status         text not null default 'ocupada'
                   check (status in ('ocupada','libre','descanso','tratamiento')),
  icon_emoji     text default '🌿',
  color_rgba     text default 'rgba(46,107,62,0.18)',
  notes          text,
  created_at     timestamptz default now()
);

-- Add FK from animals to meadows
alter table animals
  add constraint animals_meadow_fk
  foreign key (meadow_id) references meadows(id);

-- ── ANIMAL MEADOW HISTORY ────────────────────────────────────
create table animal_meadow_history (
  id          uuid primary key default uuid_generate_v4(),
  animal_id   uuid not null references animals(id) on delete cascade,
  meadow_id   uuid not null references meadows(id),
  entered_at  timestamptz not null default now(),
  left_at     timestamptz
);

-- ── MEADOW WATER LOGS ────────────────────────────────────────
create table meadow_water_logs (
  id          uuid primary key default uuid_generate_v4(),
  meadow_id   uuid not null references meadows(id) on delete cascade,
  logged_at   timestamptz not null default now()
);

-- ── MEADOW FOOD LOGS ─────────────────────────────────────────
create table meadow_food_logs (
  id          uuid primary key default uuid_generate_v4(),
  meadow_id   uuid not null references meadows(id) on delete cascade,
  logged_at   timestamptz not null default now()
);

-- ── GENETICS ─────────────────────────────────────────────────
create table animal_genetics (
  id              uuid primary key default uuid_generate_v4(),
  animal_id       uuid not null unique references animals(id) on delete cascade,
  grey            text,
  extension       text,
  agouti          text,
  cream           text,
  pearl           text,
  appaloosa_lp    text,
  dun             text,
  silver          text,
  roan            text,
  tobiano         text,
  overo           text,
  sabino          text,
  lab_pdf_path    text,
  lab_date        date,
  lab_institution text,
  notes           text,
  updated_at      timestamptz default now()
);

-- ── PREGNANCIES ──────────────────────────────────────────────
create table pregnancies (
  id                   uuid primary key default uuid_generate_v4(),
  mare_id              uuid not null references animals(id) on delete cascade,
  sire_id              uuid references animals(id),
  sire_external_name   text,
  monta_type           text not null check (monta_type in ('natural','ia')),
  vet_name             text,
  covered_date         date not null,
  confirmed_date       date,
  expected_birth_date  date,  -- auto-computed trigger or app logic
  actual_birth_date    date,
  result               text not null default 'gestante'
                         check (result in ('gestante','cria_viva','aborto','gemelar','mortinato','no_prenada')),
  foal_id              uuid references animals(id),
  notes                text,
  created_at           timestamptz default now()
);

-- ── PREGNANCY INTERESTED ─────────────────────────────────────
create table pregnancy_interested (
  id             uuid primary key default uuid_generate_v4(),
  pregnancy_id   uuid not null references pregnancies(id) on delete cascade,
  client_id      uuid not null,  -- FK after clients
  notes          text,
  created_at     timestamptz default now()
);

-- ── PREGNANCY SALES (vientre) ────────────────────────────────
create table pregnancy_sales (
  id              uuid primary key default uuid_generate_v4(),
  pregnancy_id    uuid not null references pregnancies(id) on delete cascade,
  client_id       uuid not null,  -- FK after clients
  agreed_price    numeric(10,2) not null,
  deposit_amount  numeric(10,2),
  final_amount    numeric(10,2),
  payment_status  text not null default 'sin_reserva'
                    check (payment_status in ('sin_reserva','reserva','completo')),
  delivery_date   date,
  notes           text,
  created_at      timestamptz default now()
);

-- ── CLIENTS ──────────────────────────────────────────────────
create table clients (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  phone        text,
  instagram    text,
  city         text,
  stable_name  text,
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  -- phone and instagram must be unique per owner
  unique (owner_id, phone),
  unique (owner_id, instagram)
);

-- Add FKs that depend on clients
alter table animals
  add constraint animals_sold_client_fk
  foreign key (sold_client_id) references clients(id);

alter table pregnancy_interested
  add constraint pi_client_fk
  foreign key (client_id) references clients(id);

alter table pregnancy_sales
  add constraint ps_client_fk
  foreign key (client_id) references clients(id);

-- ── SEMEN SALES / CUBRICIONES ────────────────────────────────
create table semen_sales (
  id              uuid primary key default uuid_generate_v4(),
  stallion_id     uuid not null references animals(id) on delete cascade,
  client_id       uuid not null references clients(id),
  mare_name       text,
  agreed_price    numeric(10,2) not null,
  deposit_amount  numeric(10,2),
  final_amount    numeric(10,2),
  payment_status  text not null default 'sin_reserva'
                    check (payment_status in ('sin_reserva','reserva','completo')),
  year            int not null,
  notes           text,
  created_at      timestamptz default now()
);

-- ── SEMEN SHIPPINGS ──────────────────────────────────────────
create table semen_shippings (
  id               uuid primary key default uuid_generate_v4(),
  semen_sale_id    uuid not null references semen_sales(id) on delete cascade,
  attempt_number   int not null check (attempt_number in (1,2,3)),
  estimated_date   date,
  actual_date      date,
  result           text not null default 'espera'
                     check (result in ('prenez','espera','sin_prenez')),
  notes            text,
  created_at       timestamptz default now(),
  unique (semen_sale_id, attempt_number)
);

-- ── SHOEING / HERRADO ────────────────────────────────────────
create table shoeing_records (
  id                  uuid primary key default uuid_generate_v4(),
  animal_id           uuid not null references animals(id) on delete cascade,
  date                date not null,
  type                text not null check (type in ('completo','reherrado','correctivo','descalzo')),
  farrier_name        text,
  cost                numeric(8,2),
  next_estimated_date date,
  notes               text,
  created_at          timestamptz default now()
);

-- ── HEALTH EPISODES ──────────────────────────────────────────
create table health_episodes (
  id          uuid primary key default uuid_generate_v4(),
  animal_id   uuid not null references animals(id) on delete cascade,
  title       text not null,
  start_date  date not null,
  end_date    date,
  status      text not null default 'activo'
                check (status in ('activo','resuelto','cronico')),
  vet_name    text,
  treatment   text,
  notes       text,
  created_at  timestamptz default now()
);

-- ── VACCINES ─────────────────────────────────────────────────
create table vaccines (
  id           uuid primary key default uuid_generate_v4(),
  animal_id    uuid not null references animals(id) on delete cascade,
  type         text not null,
  custom_name  text,
  date_applied date not null,
  next_date    date,
  vet_name     text,
  notes        text,
  created_at   timestamptz default now()
);

-- ── DOCUMENTS ────────────────────────────────────────────────
create table animal_documents (
  id            uuid primary key default uuid_generate_v4(),
  animal_id     uuid not null references animals(id) on delete cascade,
  name          text not null,
  type          text not null check (type in ('veterinario','genetica','certificado','otro')),
  storage_path  text not null,
  file_size_kb  int,
  issuer        text,
  issued_date   date,
  notes         text,
  created_at    timestamptz default now()
);

-- ── MAINTENANCE FEES (custodia) ──────────────────────────────
create table maintenance_fees (
  id              uuid primary key default uuid_generate_v4(),
  animal_id       uuid not null references animals(id) on delete cascade,
  monthly_amount  numeric(8,2) not null,
  effective_from  date not null,
  notes           text,
  created_at      timestamptz default now()
);

create table maintenance_entries (
  id              uuid primary key default uuid_generate_v4(),
  animal_id       uuid not null references animals(id) on delete cascade,
  fee_id          uuid not null references maintenance_fees(id),
  month           date not null,  -- first day of month
  amount          numeric(8,2) not null,
  payment_status  text not null default 'pendiente'
                    check (payment_status in ('pagado','pendiente')),
  paid_date       date,
  created_at      timestamptz default now(),
  unique (animal_id, month)
);

-- ── TASKS / AGENDA ───────────────────────────────────────────
create table tasks (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  description  text,
  due_date     date,
  status       text not null default 'pendiente'
                 check (status in ('pendiente','completada')),
  origin       text not null default 'manual'
                 check (origin in ('manual','auto_parto','auto_herrado','auto_vacuna','auto_agua','auto_comida')),
  animal_id    uuid references animals(id),
  priority     text check (priority in ('alta','media','baja')),
  completed_at timestamptz,
  created_at   timestamptz default now()
);

-- ── DAILY NOTES ──────────────────────────────────────────────
create table daily_notes (
  id         uuid primary key default uuid_generate_v4(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  content    text not null default '',
  updated_at timestamptz default now(),
  unique (owner_id, date)
);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- Every table is owner-scoped: users only see their own data
-- ─────────────────────────────────────────────────────────────

-- Helper: get current user id
-- (already available as auth.uid())

-- Enable RLS on all tables
alter table animals               enable row level security;
alter table meadows               enable row level security;
alter table animal_meadow_history enable row level security;
alter table meadow_water_logs     enable row level security;
alter table meadow_food_logs      enable row level security;
alter table animal_genetics       enable row level security;
alter table pregnancies           enable row level security;
alter table pregnancy_interested  enable row level security;
alter table pregnancy_sales       enable row level security;
alter table clients               enable row level security;
alter table semen_sales           enable row level security;
alter table semen_shippings       enable row level security;
alter table shoeing_records       enable row level security;
alter table health_episodes       enable row level security;
alter table vaccines              enable row level security;
alter table animal_documents      enable row level security;
alter table maintenance_fees      enable row level security;
alter table maintenance_entries   enable row level security;
alter table tasks                 enable row level security;
alter table daily_notes           enable row level security;

-- Animals — owned by user
create policy "animals: owner full access" on animals
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Meadows
create policy "meadows: owner full access" on meadows
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Animal meadow history — via animal ownership
create policy "amh: owner full access" on animal_meadow_history
  for all using (
    exists (select 1 from animals a where a.id = animal_id and a.owner_id = auth.uid())
  );

-- Water logs
create policy "water_logs: owner full access" on meadow_water_logs
  for all using (
    exists (select 1 from meadows m where m.id = meadow_id and m.owner_id = auth.uid())
  );

-- Food logs
create policy "food_logs: owner full access" on meadow_food_logs
  for all using (
    exists (select 1 from meadows m where m.id = meadow_id and m.owner_id = auth.uid())
  );

-- Genetics
create policy "genetics: owner full access" on animal_genetics
  for all using (
    exists (select 1 from animals a where a.id = animal_id and a.owner_id = auth.uid())
  );

-- Pregnancies
create policy "pregnancies: owner full access" on pregnancies
  for all using (
    exists (select 1 from animals a where a.id = mare_id and a.owner_id = auth.uid())
  );

-- Pregnancy interested
create policy "preg_interested: owner full access" on pregnancy_interested
  for all using (
    exists (
      select 1 from pregnancies p
      join animals a on a.id = p.mare_id
      where p.id = pregnancy_id and a.owner_id = auth.uid()
    )
  );

-- Pregnancy sales
create policy "preg_sales: owner full access" on pregnancy_sales
  for all using (
    exists (
      select 1 from pregnancies p
      join animals a on a.id = p.mare_id
      where p.id = pregnancy_id and a.owner_id = auth.uid()
    )
  );

-- Clients
create policy "clients: owner full access" on clients
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Semen sales
create policy "semen_sales: owner full access" on semen_sales
  for all using (
    exists (select 1 from animals a where a.id = stallion_id and a.owner_id = auth.uid())
  );

-- Semen shippings
create policy "semen_shippings: owner full access" on semen_shippings
  for all using (
    exists (
      select 1 from semen_sales s
      join animals a on a.id = s.stallion_id
      where s.id = semen_sale_id and a.owner_id = auth.uid()
    )
  );

-- Shoeing
create policy "shoeing: owner full access" on shoeing_records
  for all using (
    exists (select 1 from animals a where a.id = animal_id and a.owner_id = auth.uid())
  );

-- Health episodes
create policy "health: owner full access" on health_episodes
  for all using (
    exists (select 1 from animals a where a.id = animal_id and a.owner_id = auth.uid())
  );

-- Vaccines
create policy "vaccines: owner full access" on vaccines
  for all using (
    exists (select 1 from animals a where a.id = animal_id and a.owner_id = auth.uid())
  );

-- Documents
create policy "docs: owner full access" on animal_documents
  for all using (
    exists (select 1 from animals a where a.id = animal_id and a.owner_id = auth.uid())
  );

-- Maintenance fees
create policy "maint_fees: owner full access" on maintenance_fees
  for all using (
    exists (select 1 from animals a where a.id = animal_id and a.owner_id = auth.uid())
  );

-- Maintenance entries
create policy "maint_entries: owner full access" on maintenance_entries
  for all using (
    exists (select 1 from animals a where a.id = animal_id and a.owner_id = auth.uid())
  );

-- Tasks
create policy "tasks: owner full access" on tasks
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Daily notes
create policy "notes: owner full access" on daily_notes
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- STORAGE BUCKETS
-- Run separately in Supabase Storage dashboard or via API
-- ─────────────────────────────────────────────────────────────
-- Bucket: "animal-docs"   (private, max 10MB per file)
-- Bucket: "genetics-docs" (private, max 10MB per file)
-- Both with RLS: authenticated users can only access their own files
-- Path convention: {user_id}/{animal_id}/{filename}

-- ─────────────────────────────────────────────────────────────
-- INDEXES (performance)
-- ─────────────────────────────────────────────────────────────
create index on animals (owner_id);
create index on animals (meadow_id);
create index on animals (sire_id);
create index on animals (dam_id);
create index on meadows (owner_id);
create index on pregnancies (mare_id);
create index on semen_sales (stallion_id);
create index on semen_sales (client_id, year);
create index on shoeing_records (animal_id, date desc);
create index on health_episodes (animal_id);
create index on vaccines (animal_id, next_date);
create index on tasks (owner_id, due_date, status);
create index on meadow_water_logs (meadow_id, logged_at desc);
create index on meadow_food_logs (meadow_id, logged_at desc);
create index on clients (owner_id, phone);
create index on clients (owner_id, instagram);
