-- 장소 정보(영업시간·연락처·사진·설명): OpenStreetMap·위키백과에서 찾은 결과를 모든 여행이 같이 쓰는 캐시에 둔다.
-- 여러 번 실행해도 안전하다.
create table if not exists triplan.place_info (
  -- "언어|위도,경도(소수 4자리)|이름"
  key text primary key,
  data jsonb not null,
  fetched_at timestamptz not null default now()
);
alter table triplan.place_info enable row level security;

-- 일정 목록에서 바로 쓰는 값만 장소에 복사한다: 영업시간(휴무 경고), 사진(썸네일), 찾아본 시각(다시 찾지 않게)
alter table triplan.map_points add column if not exists opening_hours text;
alter table triplan.map_points add column if not exists image_url text;
alter table triplan.map_points add column if not exists info_checked_at timestamptz;
