-- Share links per trip and a wishlist of places to visit someday.
-- Safe to run more than once.

alter table triplan.trips add column if not exists edit_token text;
alter table triplan.trips add column if not exists view_token text;

-- Backfill existing trips with random tokens (gen_random_uuid is built in from PG13).
update triplan.trips
   set edit_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
 where edit_token is null;
update triplan.trips
   set view_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
 where view_token is null;

alter table triplan.trips alter column edit_token set not null;
alter table triplan.trips alter column view_token set not null;
create unique index if not exists trips_edit_token_key on triplan.trips(edit_token);
create unique index if not exists trips_view_token_key on triplan.trips(view_token);

create table if not exists triplan.wishlist_places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  continent text,
  country text,
  region text,
  lat double precision,
  lng double precision,
  memo text,
  tags text[] not null default '{}',
  priority int not null default 2,
  trip_id uuid references triplan.trips(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Supabase Data API(anon/authenticated)로는 접근하지 못하게 RLS만 켜 둔다.
-- 앱은 테이블 소유자(postgres) 연결을 쓰므로 RLS의 영향을 받지 않는다.
alter table triplan.trips enable row level security;
alter table triplan.map_points enable row level security;
alter table triplan.route_legs enable row level security;
alter table triplan.expenses enable row level security;
alter table triplan.checklist_items enable row level security;
alter table triplan.travel_docs enable row level security;
alter table triplan.wishlist_places enable row level security;
