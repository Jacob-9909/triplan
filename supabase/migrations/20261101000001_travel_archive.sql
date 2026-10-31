-- 다녀온 여행 기록: 장소 평점·한줄평과 하루 일기. 여러 번 실행해도 안전하다.

alter table triplan.map_points add column if not exists rating smallint;
alter table triplan.map_points add column if not exists review text;
do $$ begin
  alter table triplan.map_points add constraint map_points_rating_check check (rating between 1 and 5);
exception when duplicate_object then null; end $$;

-- 하루에 한 줄: 날씨·기분·일기. (trip_id, day_number) 로 덮어쓴다
create table if not exists triplan.trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references triplan.trips(id) on delete cascade,
  day_number int not null,
  weather text,
  mood text,
  note text,
  updated_at timestamptz not null default now(),
  unique (trip_id, day_number)
);
alter table triplan.trip_days enable row level security;

-- 실시간 반영 (20261031000001 의 trip_child_touch 를 그대로 쓴다)
drop trigger if exists trip_days_touch on triplan.trip_days;
create trigger trip_days_touch after insert or update or delete on triplan.trip_days
  for each row execute function triplan.trip_child_touch();
