import { randomUUID } from "node:crypto";
import { getPool, jsonError, UUID_RE, type Row } from "@/lib/db";
import { newToken, ownerOf, requireActor, requireTrip } from "@/lib/auth";
import { parseImport } from "@/lib/tripImport";
import { getT } from "@/i18n/server";

/**
 * JSON 으로 일정 가져오기 (형식: docs/import-format.md).
 * body: { data: 객체 또는 붙여 넣은 글, trip_id?: 바꿀 여행, dry_run?: true }
 * - dry_run: 검사 결과만 돌려준다 { ok, errors, warnings, plan }
 * - trip_id 없음: 새 여행을 만든다 (관리자·사용 회원)
 * - trip_id 있음: 그 여행의 장소·이동 구간·Day 구역·숙소를 모두 지우고 바꾼다. 여행 정보·가계부·예약은 두고,
 *   준비물은 없는 항목만 더한다
 * 한 트랜잭션이라 중간에 실패하면 아무것도 남지 않는다.
 */
export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  if (!b || b.data == null) return jsonError("data is required", 400);
  const tripId: string | null = b.trip_id ?? null;
  if (tripId !== null && !UUID_RE.test(tripId)) return jsonError("invalid trip_id", 400);

  // 권한부터: 새 여행은 로그인한 회원, 바꾸기는 그 여행 편집 권한
  const actor = tripId ? null : await requireActor();
  if (actor instanceof Response) return actor;
  if (tripId) {
    const access = await requireTrip(request, tripId, "edit");
    if (access instanceof Response) return access;
  }

  const t = await getT();
  const { plan, errors, warnings } = parseImport(b.data, t);
  if (!plan) {
    if (b.dry_run) return Response.json({ ok: false, errors, warnings, plan: null });
    return Response.json({ error: errors[0], errors, warnings }, { status: 400 });
  }
  if (!tripId && !plan.trip.title) {
    const e = [t("새 여행에는 trip.title 이 있어야 해요.")];
    return b.dry_run ? Response.json({ ok: false, errors: e, warnings, plan: null }) : Response.json({ error: e[0], errors: e }, { status: 400 });
  }
  if (b.dry_run) return Response.json({ ok: true, errors, warnings, plan });

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    let id = tripId;
    if (id) {
      // 바꾸기: 여행 기간을 넘는 Day 는 받지 않는다
      const { rows } = await client.query<{ span: number | null }>(
        "SELECT (end_date - start_date + 1) AS span FROM triplan.trips WHERE id = $1 FOR UPDATE",
        [id]
      );
      if (!rows[0]) {
        await client.query("ROLLBACK");
        return jsonError("not found", 404);
      }
      const span = rows[0].span;
      const over = span ? plan.days.find((d) => d.day > span) : undefined;
      if (over) {
        await client.query("ROLLBACK");
        return jsonError(t("Day {day} 는 여행 기간({span}일)을 넘어요.", { day: over.day, span: span! }), 400);
      }
      // 장소를 지우면 그 사이 구간도 함께 지워지고, 숙소 연결은 비워진다 (on delete cascade / set null)
      await client.query("DELETE FROM triplan.map_points WHERE trip_id = $1", [id]);
      await client.query("UPDATE triplan.trip_days SET area = NULL, stay_point_id = NULL WHERE trip_id = $1", [id]);
    } else {
      const tr = plan.trip;
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO triplan.trips
           (title, continent, country, region, start_date, end_date, base_currency, edit_token, view_token, owner_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [tr.title, tr.continent, tr.country, tr.region, tr.start_date, tr.end_date, tr.base_currency ?? "KRW", newToken(), newToken(), ownerOf(actor!)]
      );
      id = rows[0].id;
    }

    // ponytail: 행마다 INSERT. 장소가 500곳까지라 충분하고, 느려지면 unnest 한 번으로 바꾼다
    let points = 0, legs = 0;
    for (const d of plan.days) {
      const ids = d.places.map(() => randomUUID());
      for (const [i, p] of d.places.entries()) {
        await client.query(
          `INSERT INTO triplan.map_points
             (id, trip_id, name, category, memo, lat, lng, day_number, visit_order, link_url, start_time, stay_min)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [ids[i], id, p.name, p.category, p.memo, p.lat, p.lng, d.day, i + 1, p.link_url, p.start_time, p.stay_min]
        );
        points++;
      }
      for (const l of d.legs) {
        await client.query(
          `INSERT INTO triplan.route_legs
             (trip_id, from_point_id, to_point_id, method, duration_min, distance_km, method_chosen, duration_manual)
           VALUES ($1,$2,$3,$4,$5,$6,true,$7)`,
          [id, ids[l.from], ids[l.from + 1], l.method, l.duration_min, l.distance_km, l.duration_min !== null]
        );
        legs++;
      }
      if (d.area || d.stay !== null) {
        await client.query(
          `INSERT INTO triplan.trip_days (trip_id, day_number, area, stay_point_id) VALUES ($1,$2,$3,$4)
           ON CONFLICT (trip_id, day_number) DO UPDATE SET area = EXCLUDED.area, stay_point_id = EXCLUDED.stay_point_id, updated_at = now()`,
          [id, d.day, d.area, d.stay === null ? null : ids[d.stay]]
        );
      }
    }
    // 준비물: 이미 있는 이름은 건너뛴다
    if (plan.checklist.length) {
      await client.query(
        `INSERT INTO triplan.checklist_items (trip_id, label, category, is_checked, sort_order)
         SELECT $1, l.label, 'etc', false, 1000 + l.ord
           FROM unnest($2::text[]) WITH ORDINALITY AS l(label, ord)
          WHERE NOT EXISTS (SELECT 1 FROM triplan.checklist_items c WHERE c.trip_id = $1 AND c.label = l.label)`,
        [id, plan.checklist]
      );
    }
    const { rows: done } = await client.query<Row>("SELECT * FROM triplan.trips WHERE id = $1", [id]);
    await client.query("COMMIT");
    return Response.json({ trip: done[0], points, legs, warnings });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => null);
    console.error("POST /api/trips/import failed:", err);
    return jsonError(t("일정을 가져오지 못했어요."));
  } finally {
    client.release();
  }
}
