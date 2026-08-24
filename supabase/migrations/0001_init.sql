-- Triplan 초기 스키마

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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

create table if not exists map_points (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null,
  category text not null default 'attraction',
  memo text,
  lat double precision not null,
  lng double precision not null,
  day_number int,
  visit_order int,
  created_at timestamptz not null default now()
);
create index if not exists map_points_trip_idx on map_points(trip_id);

create table if not exists route_legs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  from_point_id uuid not null references map_points(id) on delete cascade,
  to_point_id uuid not null references map_points(id) on delete cascade,
  method text not null default 'transit',
  duration_min int,
  distance_km double precision,
  cost numeric,
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  point_id uuid references map_points(id) on delete set null,
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

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  label text not null,
  is_checked boolean not null default false,
  sort_order int not null default 0
);

create table if not exists travel_docs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  type text not null default 'etc',
  title text not null,
  provider text,
  confirmation_code text,
  url text,
  starts_at date,
  ends_at date,
  file_path text
);

-- RLS: 자기 여행만 접근
alter table trips enable row level security;
alter table map_points enable row level security;
alter table route_legs enable row level security;
alter table expenses enable row level security;
alter table checklist_items enable row level security;
alter table travel_docs enable row level security;

create policy "own trips" on trips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "trip children access" on map_points
  for all using (exists (select 1 from trips t where t.id = trip_id and auth.uid() = t.user_id))
  with check (exists (select 1 from trips t where t.id = trip_id and auth.uid() = t.user_id));

create policy "trip children access" on route_legs
  for all using (exists (select 1 from trips t where t.id = trip_id and auth.uid() = t.user_id))
  with check (exists (select 1 from trips t where t.id = trip_id and auth.uid() = t.user_id));

create policy "trip children access" on expenses
  for all using (exists (select 1 from trips t where t.id = trip_id and auth.uid() = t.user_id))
  with check (exists (select 1 from trips t where t.id = trip_id and auth.uid() = t.user_id));

create policy "trip children access" on checklist_items
  for all using (exists (select 1 from trips t where t.id = trip_id and auth.uid() = t.user_id))
  with check (exists (select 1 from trips t where t.id = trip_id and auth.uid() = t.user_id));

create policy "trip children access" on travel_docs
  for all using (exists (select 1 from trips t where t.id = trip_id and auth.uid() = t.user_id))
  with check (exists (select 1 from trips t where t.id = trip_id and auth.uid() = t.user_id));
