-- 그날 밤 묵는 숙소 (Day N 의 밤). 다음 날은 이 숙소에서 출발하고, 그날은 이 숙소로 돌아온다.
-- 숙소 장소를 지우면 비운다. 여러 번 실행해도 안전하다.
alter table triplan.trip_days
  add column if not exists stay_point_id uuid references triplan.map_points(id) on delete set null;
