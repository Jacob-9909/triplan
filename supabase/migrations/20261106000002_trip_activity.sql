-- 여행 변경 기록: 누가 언제 무엇을 했는지 (장소 추가·이동·삭제, 지출·예약 추가·삭제, 여행 정보 수정)
-- actor 는 회원 아이디, 또는 '@admin' · '@edit-link' 같은 특별한 이름 (화면에서 번역한다)
create table if not exists triplan.trip_activity (
  id bigint generated always as identity primary key,
  trip_id uuid not null references triplan.trips(id) on delete cascade,
  actor text not null,
  action text not null,
  target text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists trip_activity_trip_idx on triplan.trip_activity(trip_id, id desc);

alter table triplan.trip_activity enable row level security;

-- 새 기록이 생기면 보고 있는 화면에 알린다. 기록은 변경에 딸려 오므로 rev 는 올리지 않는다
create or replace function triplan.trip_activity_notify() returns trigger language plpgsql as $$
begin
  perform pg_notify('triplan_trip', new.trip_id::text || ':trip_activity');
  return null;
end $$;

drop trigger if exists trip_activity_notify on triplan.trip_activity;
create trigger trip_activity_notify after insert on triplan.trip_activity
  for each row execute function triplan.trip_activity_notify();
