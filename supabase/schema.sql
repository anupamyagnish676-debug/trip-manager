-- =========================================================================
-- TripSplit Portal: Clean & Idempotent Supabase SQL Setup v2
-- Run this in your Supabase SQL Editor (safe to run multiple times)
-- =========================================================================

-- 1. Create Tables in strict dependency order

create table if not exists public.trips (
    id text primary key,
    name text not null,
    destination text not null,
    start_date text not null,
    end_date text not null,
    finance_lead_id text not null,
    finance_lead_custom_qr_image text,
    invite_code text,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Add invite_code if upgrading from v1
alter table public.trips add column if not exists invite_code text;
alter table public.trips add column if not exists finance_lead_custom_qr_image text;

create table if not exists public.members (
    id text primary key,
    trip_id text not null references public.trips(id) on delete cascade,
    name text not null,
    upi_id text,
    phone text,
    avatar_color text default 'bg-emerald-600',
    is_finance_lead boolean default false,
    role text default 'member', -- 'finance_manager' | 'trip_manager' | 'member'
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Add role column if upgrading from v1
alter table public.members add column if not exists role text default 'member';

create table if not exists public.expenses (
    id text primary key,
    trip_id text not null references public.trips(id) on delete cascade,
    title text not null,
    amount numeric(12, 2) not null,
    category text not null,
    paid_by text not null,
    paid_at text not null,
    split_type text default 'equal',
    splits jsonb not null default '[]'::jsonb,
    notes text,
    receipt_url text,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.payments (
    id text primary key,
    trip_id text not null references public.trips(id) on delete cascade,
    sender_name text not null,
    amount numeric(12, 2) not null,
    utr text,
    timestamp timestamptz default timezone('utc'::text, now()) not null,
    raw_text text,
    matched_member_id text references public.members(id) on delete set null,
    status text default 'verified',
    added_to_pot boolean default true,
    collection_round_id text,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.settlements (
    id text primary key,
    trip_id text not null references public.trips(id) on delete cascade,
    from_member_id text not null references public.members(id) on delete cascade,
    to_member_id text not null references public.members(id) on delete cascade,
    amount numeric(12, 2) not null,
    status text default 'pending',
    settled_at timestamptz,
    utr text,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Collection rounds table (new in v2)
create table if not exists public.collection_rounds (
    id text primary key,
    trip_id text not null references public.trips(id) on delete cascade,
    title text not null,
    target_per_person numeric(12, 2) not null,
    due_date text,
    member_status jsonb not null default '{}'::jsonb,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. Indexes
create index if not exists idx_members_trip on public.members(trip_id);
create index if not exists idx_expenses_trip on public.expenses(trip_id);
create index if not exists idx_payments_trip on public.payments(trip_id);
create index if not exists idx_settlements_trip on public.settlements(trip_id);
create index if not exists idx_rounds_trip on public.collection_rounds(trip_id);

-- 3. Row Level Security (RLS)
alter table public.trips enable row level security;
alter table public.members enable row level security;
alter table public.expenses enable row level security;
alter table public.payments enable row level security;
alter table public.settlements enable row level security;
alter table public.collection_rounds enable row level security;

-- 4. Drop and recreate open policies (all members can read and write)
drop policy if exists "Allow public all on trips" on public.trips;
create policy "Allow public all on trips" on public.trips for all using (true) with check (true);

drop policy if exists "Allow public all on members" on public.members;
create policy "Allow public all on members" on public.members for all using (true) with check (true);

drop policy if exists "Allow public all on expenses" on public.expenses;
create policy "Allow public all on expenses" on public.expenses for all using (true) with check (true);

drop policy if exists "Allow public all on payments" on public.payments;
create policy "Allow public all on payments" on public.payments for all using (true) with check (true);

drop policy if exists "Allow public all on settlements" on public.settlements;
create policy "Allow public all on settlements" on public.settlements for all using (true) with check (true);

drop policy if exists "Allow public all on collection_rounds" on public.collection_rounds;
create policy "Allow public all on collection_rounds" on public.collection_rounds for all using (true) with check (true);

-- 5. Safely add all tables to Realtime Publication (idempotent)
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'trips') then
    alter publication supabase_realtime add table public.trips;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'members') then
    alter publication supabase_realtime add table public.members;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'expenses') then
    alter publication supabase_realtime add table public.expenses;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'payments') then
    alter publication supabase_realtime add table public.payments;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'settlements') then
    alter publication supabase_realtime add table public.settlements;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'collection_rounds') then
    alter publication supabase_realtime add table public.collection_rounds;
  end if;
end $$;

-- 6. Permissions Grant for anon and authenticated API roles
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
