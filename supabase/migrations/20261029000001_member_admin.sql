-- 관리자 권한을 받은 회원: 로그인하면 ADMIN_PASSWORD 관리자와 똑같이 쓴다
alter table triplan.members add column if not exists is_admin boolean not null default false;
