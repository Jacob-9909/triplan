-- 장소 영업시간 (OSM opening_hours 형식). 여러 번 실행해도 안전하다.
-- null 은 아직 찾아보지 않음, '' 는 찾아봤지만 없음. 그 밖에는 OSM 값이거나 사용자가 직접 적은 값이다.
alter table triplan.map_points add column if not exists opening_hours text;
