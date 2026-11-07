-- 장소 정보(사진·설명·연락처·주소): OpenStreetMap(Nominatim)·위키백과에서 찾은 결과를 모든 여행이 같이 쓰는 캐시에 둔다.
-- 여러 번 실행해도 안전하다.
create table if not exists triplan.place_info (
  -- "언어|위도,경도(소수 4자리)|이름"
  key text primary key,
  data jsonb not null,
  fetched_at timestamptz not null default now()
);
alter table triplan.place_info enable row level security;

-- 일정 목록 썸네일용 사진과, 찾아본 시각(다시 찾지 않게). 영업시간은 20261106000001 의 opening_hours 를 같이 쓴다
alter table triplan.map_points add column if not exists image_url text;
alter table triplan.map_points add column if not exists info_checked_at timestamptz;
