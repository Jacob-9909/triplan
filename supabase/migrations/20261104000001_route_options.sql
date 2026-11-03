-- 실제 경로: 구간·이동수단마다 한 번 받아 둔 경로와, 사람이 고른 값인지 표시. 여러 번 실행해도 안전하다.

-- 사람이 이동수단을 골랐는지 / 시간을 직접 고쳤는지. 기존 구간은 모두 아니라고 본다
alter table triplan.route_legs add column if not exists method_chosen boolean not null default false;
alter table triplan.route_legs add column if not exists duration_manual boolean not null default false;

create table if not exists triplan.route_options (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references triplan.trips(id) on delete cascade,
  leg_id uuid not null references triplan.route_legs(id) on delete cascade,
  method text not null,
  source text not null,
  duration_min int not null,
  distance_km double precision not null,
  fare_krw int,
  -- [lng, lat] 목록
  shape jsonb not null,
  -- 대중교통 단계 (걷기·탈것). 그 밖의 이동수단은 null
  steps jsonb,
  -- 받을 때의 양 끝 좌표. 핀이 옮겨지면 다시 받는다
  from_lat double precision not null,
  from_lng double precision not null,
  to_lat double precision not null,
  to_lng double precision not null,
  fetched_at timestamptz not null default now(),
  unique (leg_id, method)
);
create index if not exists route_options_trip_idx on triplan.route_options (trip_id);
alter table triplan.route_options enable row level security;

-- 실시간 반영 (20261031000001 의 trip_child_touch 를 그대로 쓴다)
drop trigger if exists route_options_touch on triplan.route_options;
create trigger route_options_touch after insert or update or delete on triplan.route_options
  for each row execute function triplan.trip_child_touch();
