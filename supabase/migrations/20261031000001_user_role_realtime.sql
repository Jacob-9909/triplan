-- 회원 권한을 demo(체험, 보기 전용) / user(사용: 내 여행·위시리스트, 회원 초대로 함께 편집) 로 나눈다.
-- 관리자는 ADMIN_PASSWORD 한 명뿐이다. 기존 is_admin 회원은 user 로 바꾼다.
-- 여러 번 실행해도 안전하다.

alter table triplan.members add column if not exists role text not null default 'demo';
do $$ begin
  alter table triplan.members add constraint members_role_check check (role in ('demo', 'user'));
exception when duplicate_object then null; end $$;
-- is_admin 컬럼이 있을 때만 옮긴다 (컬럼은 이전 버전 롤백을 위해 남겨 두되 더 쓰지 않는다)
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'triplan' and table_name = 'members' and column_name = 'is_admin') then
    update triplan.members set role = 'user', is_admin = false where is_admin;
  end if;
end $$;

-- 주인: null 이면 관리자. 회원을 지우면 여행은 관리자에게 남고, 위시리스트는 함께 지운다
alter table triplan.trips add column if not exists owner_id uuid references triplan.members(id) on delete set null;
alter table triplan.wishlist_places add column if not exists owner_id uuid references triplan.members(id) on delete cascade;
create index if not exists trips_owner_idx on triplan.trips(owner_id);
create index if not exists wishlist_owner_idx on triplan.wishlist_places(owner_id);

-- 여행에 초대된 회원 (함께 편집)
create table if not exists triplan.trip_members (
  trip_id uuid not null references triplan.trips(id) on delete cascade,
  member_id uuid not null references triplan.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (trip_id, member_id)
);
create index if not exists trip_members_member_idx on triplan.trip_members(member_id);
alter table triplan.trip_members enable row level security;

-- 실시간 반영: 여행이나 하위 데이터가 바뀌면 trips.rev 를 올리고 NOTIFY 를 보낸다.
-- payload "<trip_id>:<table>". 같은 트랜잭션의 같은 payload 는 Postgres 가 한 번으로 합친다.
alter table triplan.trips add column if not exists rev bigint not null default 0;

create or replace function triplan.trip_touch() returns trigger language plpgsql as $$
begin
  -- 하위 테이블 트리거가 rev 를 올린 경우엔 이미 그쪽에서 알렸으므로 다시 알리지 않는다
  if new.rev is not distinct from old.rev then
    new.rev := old.rev + 1;
    perform pg_notify('triplan_trip', new.id::text || ':trips');
  end if;
  return new;
end $$;

create or replace function triplan.trip_child_touch() returns trigger language plpgsql as $$
declare
  tid uuid := coalesce(new.trip_id, old.trip_id);
begin
  -- 변경 전 여행과 변경 후 여행이 다르면 둘 다 알린다
  if tg_op = 'UPDATE' and new.trip_id is distinct from old.trip_id then
    update triplan.trips set rev = rev + 1 where id = old.trip_id;
    perform pg_notify('triplan_trip', old.trip_id::text || ':' || tg_table_name);
  end if;
  update triplan.trips set rev = rev + 1 where id = tid;
  perform pg_notify('triplan_trip', tid::text || ':' || tg_table_name);
  return null;
end $$;

drop trigger if exists trips_touch on triplan.trips;
create trigger trips_touch before update on triplan.trips
  for each row execute function triplan.trip_touch();

do $$
declare t text;
begin
  foreach t in array array['map_points', 'route_legs', 'expenses', 'checklist_items', 'travel_docs', 'point_photos'] loop
    execute format('drop trigger if exists %I on triplan.%I', t || '_touch', t);
    execute format(
      'create trigger %I after insert or update or delete on triplan.%I for each row execute function triplan.trip_child_touch()',
      t || '_touch', t);
  end loop;
end $$;
