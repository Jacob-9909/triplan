-- 체크리스트 항목 카테고리 구분
alter table checklist_items add column if not exists category text not null default 'etc';
