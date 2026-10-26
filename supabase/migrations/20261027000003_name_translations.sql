-- 지도 라벨·장소 이름 한국어 번역 캐시. Safe to run more than once.
-- 무료 번역 API 한도를 아끼려고 한 번 번역한 이름은 모든 여행이 같이 쓴다.
-- ko가 null이면 번역해 봤지만 한국어가 나오지 않은 이름 (다시 묻지 않는다).

create table if not exists triplan.name_translations (
  source text primary key,
  ko text,
  created_at timestamptz not null default now()
);

alter table triplan.name_translations enable row level security;
