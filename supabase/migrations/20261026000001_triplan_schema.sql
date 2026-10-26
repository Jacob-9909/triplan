-- Triplan schema for Supabase (or any PostgreSQL 13+).
-- The Next.js API connects with `pg` through DATABASE_URL and does its own access control.
-- Tables live in the `triplan` schema, which is not exposed through the Supabase Data API
-- (see supabase/config.toml [api].schemas), and RLS is enabled with no policies as a second guard.
-- Apply with `supabase db push`, or paste the files in this folder into the SQL editor in order.

create schema if not exists triplan;

create table if not exists triplan.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  continent text,
  country text,
  region text,
  start_date date,
  end_date date,
  base_currency text not null default 'KRW',
  cover_image_url text,
  created_at timestamptz not null default now()
);

create table if not exists triplan.map_points (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references triplan.trips(id) on delete cascade,
  name text not null,
  category text not null default 'attraction',
  memo text,
  lat double precision not null,
  lng double precision not null,
  day_number int,
  visit_order int,
  created_at timestamptz not null default now()
);
create index if not exists map_points_trip_idx on triplan.map_points(trip_id);

create table if not exists triplan.route_legs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references triplan.trips(id) on delete cascade,
  from_point_id uuid not null references triplan.map_points(id) on delete cascade,
  to_point_id uuid not null references triplan.map_points(id) on delete cascade,
  method text not null default 'transit',
  duration_min int,
  distance_km double precision,
  cost numeric,
  created_at timestamptz not null default now()
);

create table if not exists triplan.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references triplan.trips(id) on delete cascade,
  point_id uuid references triplan.map_points(id) on delete set null,
  day_number int,
  category text not null default 'etc',
  title text not null,
  amount_local numeric not null,
  currency_code text not null,
  exchange_rate_krw numeric not null,
  amount_krw numeric not null,
  spent_at date,
  created_at timestamptz not null default now()
);

create table if not exists triplan.checklist_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references triplan.trips(id) on delete cascade,
  label text not null,
  category text not null default 'etc',
  is_checked boolean not null default false,
  sort_order int not null default 0
);

create table if not exists triplan.travel_docs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references triplan.trips(id) on delete cascade,
  type text not null default 'etc',
  title text not null,
  provider text,
  confirmation_code text,
  url text,
  starts_at date,
  ends_at date,
  file_path text
);
