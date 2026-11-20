-- =========================================================================
-- TripSplit UPI: Supabase PostgreSQL Schema & Realtime Configuration
-- =========================================================================

-- 1. Trips Table
create table if not exists public.trips (
    id text primary key,
    name text not null,
    destination text not null,
    start_date text not null,
    end_date text not null,
    finance_lead_id text not null,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. Members Table
create table if not exists public.members (
    id text primary key,
    trip_id text not null references public.trips(id) on delete cascade,
    name text not null,
    upi_id text,
    phone text,
    avatar_color text default 'bg-emerald-600',
    is_finance_lead boolean default false,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 3. Expenses Table
create table if not exists public.expenses (
    id text primary key,
    trip_id text not null references public.trips(id) on delete cascade,
    title text not null,
    amount numeric(12, 2) not null,
    category text not null,
    paid_by text not null, -- 'POT' or member id
    paid_at text not null,
    split_type text default 'equal',
    splits jsonb not null default '[]'::jsonb,
    notes text,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 4. Inbound Payments / QR Credits Table
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
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 5. Settlements Table
create table if not exists public.settlements (
    id text primary key,
    trip_id text not null references public.trips(id) on delete cascade,
    from_member_id text not null references public.members(id) on delete cascade,
    to_member_id text not null references public.members(id) on delete cascade,
    amount numeric(12, 2) not null,
    status text default 'pending', -- 'pending' or 'settled'
    settled_at timestamptz,
    utr text,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Indexes for lightning fast queries
create index if not exists idx_members_trip on public.members(trip_id);
create index if not exists idx_expenses_trip on public.expenses(trip_id);
create index if not exists idx_payments_trip on public.payments(trip_id);
create index if not exists idx_settlements_trip on public.settlements(trip_id);

-- Enable Row Level Security (RLS)
alter table public.trips enable row level security;
alter table public.members enable row level security;
alter table public.expenses enable row level security;
alter table public.payments enable row level security;
alter table public.settlements enable row level security;

-- Open policies for group trip access (can be scoped to auth user later)
create policy "Allow public read access on trips" on public.trips for select using (true);
create policy "Allow public insert/update on trips" on public.trips for all using (true);

create policy "Allow public read access on members" on public.members for select using (true);
create policy "Allow public insert/update on members" on public.members for all using (true);

create policy "Allow public read access on expenses" on public.expenses for select using (true);
create policy "Allow public insert/update on expenses" on public.expenses for all using (true);

create policy "Allow public read access on payments" on public.payments for select using (true);
create policy "Allow public insert/update on payments" on public.payments for all using (true);

create policy "Allow public read access on settlements" on public.settlements for select using (true);
create policy "Allow public insert/update on settlements" on public.settlements for all using (true);

-- Enable Supabase Realtime broadcast on all tables
alter publication supabase_realtime add table public.trips;
alter publication supabase_realtime add table public.members;
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.payments;
alter publication supabase_realtime add table public.settlements;
