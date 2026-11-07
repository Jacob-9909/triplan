-- 동행 의견: 장소마다 좋아요(이름별 하나)와 댓글. 이름은 화면에서 고른 동행자 이름이다 (공유 링크는 계정이 없다).
-- 여러 번 실행해도 안전하다.
create table if not exists triplan.point_comments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references triplan.trips(id) on delete cascade,
  point_id uuid not null references triplan.map_points(id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists point_comments_trip_idx on triplan.point_comments (trip_id);
alter table triplan.point_comments enable row level security;

create table if not exists triplan.point_votes (
  trip_id uuid not null references triplan.trips(id) on delete cascade,
  point_id uuid not null references triplan.map_points(id) on delete cascade,
  voter text not null,
  created_at timestamptz not null default now(),
  primary key (point_id, voter)
);
create index if not exists point_votes_trip_idx on triplan.point_votes (trip_id);
alter table triplan.point_votes enable row level security;

-- 실시간 반영 (20261031000001 의 trip_child_touch 를 그대로 쓴다)
drop trigger if exists point_comments_touch on triplan.point_comments;
create trigger point_comments_touch after insert or update or delete on triplan.point_comments
  for each row execute function triplan.trip_child_touch();
drop trigger if exists point_votes_touch on triplan.point_votes;
create trigger point_votes_touch after insert or update or delete on triplan.point_votes
  for each row execute function triplan.trip_child_touch();
