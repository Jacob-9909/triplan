-- 여행 중 도구: 예산, 동행자 정산. 여러 번 실행해도 안전하다.

-- 예산(원화)과 정산에 쓰는 동행자 이름
alter table triplan.trips add column if not exists budget_krw numeric;
alter table triplan.trips add column if not exists travelers text[] not null default '{}';
do $$ begin
  alter table triplan.trips add constraint trips_budget_check check (budget_krw >= 0);
exception when duplicate_object then null; end $$;

-- 누가 냈는지, 누구 몫인지 (split_with 가 null 이면 동행자 전원)
alter table triplan.expenses add column if not exists paid_by text;
alter table triplan.expenses add column if not exists split_with text[];
