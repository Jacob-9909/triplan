-- 장소별 링크와 사진. Safe to run more than once.

alter table triplan.map_points add column if not exists link_url text;

-- 사진은 브라우저에서 줄인 JPEG(긴 변 1600px)를 그대로 저장한다.
-- 별도 스토리지 버킷 없이 같은 DB 권한 검사로 보호하기 위함.
create table if not exists triplan.point_photos (
  id uuid primary key default gen_random_uuid(),
  point_id uuid not null references triplan.map_points(id) on delete cascade,
  trip_id uuid not null references triplan.trips(id) on delete cascade,
  content_type text not null default 'image/jpeg',
  data bytea not null,
  width int,
  height int,
  created_at timestamptz not null default now()
);
create index if not exists point_photos_point_idx on triplan.point_photos(point_id);

alter table triplan.point_photos enable row level security;
