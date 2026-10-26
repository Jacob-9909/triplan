-- 장소별 핀 색상과 타임테이블용 시간. Safe to run more than once.

-- 지정하지 않으면 분류 기본색을 쓴다 (#rrggbb)
alter table triplan.map_points add column if not exists color text;
-- 도착 시각(선택). 비워 두면 앞 장소 + 이동 시간으로 자동 계산
alter table triplan.map_points add column if not exists start_time time;
-- 머무는 시간(분). 비워 두면 60분으로 계산
alter table triplan.map_points add column if not exists stay_min int;
