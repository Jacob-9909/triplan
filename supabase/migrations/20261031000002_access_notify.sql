-- 권한이 바뀔 수 있는 변경도 열려 있는 여행 화면에 알린다 (payload "<trip_id>:access").
-- 화면은 알림을 받으면 여행을 다시 불러오고, 401/403/404 면 "접근할 수 없게 됐어요" 화면을 보여 준다.
-- - 초대 추가·취소·나가기 (trip_members)
-- - 여행 삭제 (하위 데이터가 없으면 하위 트리거가 안 돌기 때문)
-- - 회원 권한·비밀번호 변경 (그 회원이 주인이거나 초대된 여행 전부)
-- 여러 번 실행해도 안전하다.

create or replace function triplan.trip_access_touch() returns trigger language plpgsql as $$
begin
  perform pg_notify('triplan_trip', coalesce(new.trip_id, old.trip_id)::text || ':access');
  return null;
end $$;

drop trigger if exists trip_members_touch on triplan.trip_members;
create trigger trip_members_touch after insert or delete on triplan.trip_members
  for each row execute function triplan.trip_access_touch();

create or replace function triplan.trip_deleted() returns trigger language plpgsql as $$
begin
  perform pg_notify('triplan_trip', old.id::text || ':access');
  return null;
end $$;

drop trigger if exists trips_deleted on triplan.trips;
create trigger trips_deleted after delete on triplan.trips
  for each row execute function triplan.trip_deleted();

create or replace function triplan.member_access_touch() returns trigger language plpgsql as $$
declare tid uuid;
begin
  for tid in
    select id from triplan.trips where owner_id = new.id
    union
    select trip_id from triplan.trip_members where member_id = new.id
  loop
    perform pg_notify('triplan_trip', tid::text || ':access');
  end loop;
  return null;
end $$;

drop trigger if exists members_access_touch on triplan.members;
create trigger members_access_touch after update of role, password_hash on triplan.members
  for each row
  when (new.role is distinct from old.role or new.password_hash is distinct from old.password_hash)
  execute function triplan.member_access_touch();
