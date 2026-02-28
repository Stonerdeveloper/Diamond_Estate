-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Streets Table
create table public.streets (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    created_at timestamptz default now()
);

-- Apartments Table
create table public.apartments (
    id uuid primary key default uuid_generate_v4(),
    street_id uuid references public.streets(id) on delete cascade,
    unit_number text not null,
    created_at timestamptz default now()
);

-- Residents Table (Extends Supabase Auth)
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    phone text,
    role text check (role in ('landlord', 'tenant', 'admin')) default 'tenant',
    created_at timestamptz default now()
);

-- Resident-Apartment Link
create table public.resident_apartments (
    resident_id uuid references public.profiles(id) on delete cascade,
    apartment_id uuid references public.apartments(id) on delete cascade,
    is_primary boolean default true,
    primary key (resident_id, apartment_id)
);

-- Levy Types Table
create table public.levy_types (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    description text,
    created_at timestamptz default now()
);

-- Levy Rates Table
create table public.levy_rates (
    id uuid primary key default uuid_generate_v4(),
    levy_type_id uuid references public.levy_types(id) on delete cascade,
    resident_role text check (resident_role in ('landlord', 'tenant')),
    amount decimal(12,2) not null,
    created_at timestamptz default now()
);

-- Levy Bills Table
create table public.levy_bills (
    id uuid primary key default uuid_generate_v4(),
    apartment_id uuid references public.apartments(id) on delete cascade,
    levy_type_id uuid references public.levy_types(id) on delete cascade,
    amount decimal(12,2) not null,
    billing_period date not null,
    status text check (status in ('unpaid', 'partial', 'paid')) default 'unpaid',
    created_at timestamptz default now()
);

-- Payments Table
create table public.payments (
    id uuid primary key default uuid_generate_v4(),
    bill_id uuid references public.levy_bills(id) on delete cascade,
    resident_id uuid references public.profiles(id) on delete cascade,
    amount decimal(12,2) not null,
    payment_date timestamptz default now(),
    paystack_reference text unique,
    status text check (status in ('success', 'failed', 'pending')) default 'pending'
);

-- Broadcasts Table
create table public.broadcasts (
    id uuid primary key default uuid_generate_v4(),
    sender_id uuid references public.profiles(id),
    title text not null,
    content text not null,
    target_audience text default 'all',
    sent_at timestamptz default now()
);

-- Expenses Table
create table public.expenses (
    id uuid primary key default uuid_generate_v4(),
    category text not null,
    amount decimal(12,2) not null,
    expense_date date not null,
    description text,
    created_at timestamptz default now()
);

-- Add some default streets
insert into public.streets (name) values ('Diamond Avenue'), ('Emerald Way'), ('Sapphire Street');

-- Add some default levy types
insert into public.levy_types (name, description) values ('Security', 'Monthly security levy for estate maintenance');

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.streets enable row level security;
alter table public.apartments enable row level security;
alter table public.resident_apartments enable row level security;
alter table public.levy_bills enable row level security;
alter table public.payments enable row level security;
alter table public.broadcasts enable row level security;
alter table public.expenses enable row level security;
