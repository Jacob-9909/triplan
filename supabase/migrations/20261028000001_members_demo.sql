-- 체험 회원: 관리자가 만든 아이디/비밀번호로만 로그인하고, is_demo 여행만 읽기 전용으로 본다
create table if not exists triplan.members (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);
alter table triplan.members enable row level security;

alter table triplan.trips add column if not exists is_demo boolean not null default false;
