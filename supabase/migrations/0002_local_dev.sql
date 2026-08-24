-- 로컬 개발용: 로그인 없이도 사용 가능하도록 정책 완화 (프로덕션 배포 전 제거할 것)

drop policy if exists "own trips" on trips;
drop policy if exists "trip children access" on map_points;
drop policy if exists "trip children access" on route_legs;
drop policy if exists "trip children access" on expenses;
drop policy if exists "trip children access" on checklist_items;
drop policy if exists "trip children access" on travel_docs;

create policy "dev all trips" on trips
  for all using (true) with check (true);

create policy "dev all map_points" on map_points
  for all using (true) with check (true);

create policy "dev all route_legs" on route_legs
  for all using (true) with check (true);

create policy "dev all expenses" on expenses
  for all using (true) with check (true);

create policy "dev all checklist_items" on checklist_items
  for all using (true) with check (true);

create policy "dev all travel_docs" on travel_docs
  for all using (true) with check (true);
