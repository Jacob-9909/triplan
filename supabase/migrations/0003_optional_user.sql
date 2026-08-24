-- 익명(비로그인) 사용도 허용: user_id 선택적 변경
alter table trips alter column user_id drop not null;
