-- Day 마다 넣은 구역 이름 (후보함 구역 묶기). 여러 번 실행해도 안전하다.
alter table triplan.trip_days add column if not exists area text;
