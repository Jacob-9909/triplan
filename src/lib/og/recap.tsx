import { format, parseISO } from "date-fns";
import type { Expense, MapPoint, RouteLeg, Trip } from "@/lib/types";
import { getPool } from "@/lib/db";
import { tripStats } from "@/features/archive/stats";
import { stampLook } from "@/features/archive/stamp";
import { formatRange, nights, stayLabel } from "@/features/ui/dates";
import { intlLocale, makeT, type Locale } from "@/i18n/translate";
import { clip, fitSize, joinDots, topRated } from "./logic";
import { COLORS, CoverLayer, frame, loadCover, renderPng, Stars, Wordmark } from "./parts";

// 다녀온 여행 회고 카드 (1080×1350, 인스타 세로 비율). 기록 탭(RecordTab)과 같은 데이터·통계를 쓴다

export const RECAP_SIZE = { width: 1080, height: 1350 };
const W = RECAP_SIZE.width;
const PAD = 64;
const BAND = 450;

type RecapTrip = Pick<Trip, "id" | "title" | "continent" | "country" | "region" | "start_date" | "end_date">;

export type RecapData = NonNullable<Awaited<ReturnType<typeof loadRecap>>>;

/** 기록 탭이 받는 것과 같은 표: 여행·장소·구간·지출. 여행이 없으면 null */
export async function loadRecap(tripId: string) {
  const pool = getPool();
  const [trip, points, legs, expenses] = await Promise.all([
    pool.query<RecapTrip>(
      "SELECT id, title, continent, country, region, start_date, end_date, cover_image_url FROM triplan.trips WHERE id = $1",
      [tripId]
    ),
    pool.query<MapPoint>("SELECT * FROM triplan.map_points WHERE trip_id = $1", [tripId]),
    pool.query<RouteLeg>("SELECT * FROM triplan.route_legs WHERE trip_id = $1", [tripId]),
    pool.query<Expense>("SELECT * FROM triplan.expenses WHERE trip_id = $1", [tripId]),
  ]);
  return trip.rows[0] ? { trip: trip.rows[0], points: points.rows, legs: legs.rows, expenses: expenses.rows } : null;
}

/** 여권 도장: 화면 TripStamp 와 같은 잉크·모양·기울기. 이미지 렌더러는 SVG 글자를 못 그려 상자로 만든다 */
function Stamp({ trip, locale }: { trip: RecapTrip; locale: Locale }) {
  const t = makeT(locale);
  const { ink, round, tilt } = stampLook(trip.id);
  const place = clip((trip.region && t(trip.region)) || (trip.country && t(trip.country)) || trip.title, 8);
  const top = clip(((trip.country && t(trip.country)) || trip.title).toUpperCase(), 14);
  const date = trip.start_date ? format(parseISO(trip.start_date), "yyyy.MM.dd") : "";
  const stay = stayLabel(trip, locale) ?? "";
  const size = round ? { width: 250, height: 250, borderRadius: 125 } : { width: 270, height: 196, borderRadius: 26 };
  const inner = round ? { width: 214, height: 214, borderRadius: 107 } : { width: 244, height: 170, borderRadius: 16 };
  return (
    <div
      style={{
        position: "absolute",
        top: BAND - (round ? 150 : 120),
        right: PAD - 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...size,
        border: `7px solid ${ink}`,
        background: "rgba(251,247,241,0.95)",
        transform: `rotate(${tilt}deg)`,
        opacity: 0.94,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          ...inner,
          border: `2px solid ${ink}`,
          color: ink,
        }}
      >
        <div style={{ display: "flex", fontSize: 17, fontWeight: 800, letterSpacing: 3 }}>{top}</div>
        <div style={{ display: "flex", marginTop: 6, fontSize: 38, fontWeight: 800, letterSpacing: -1 }}>{place}</div>
        {date && <div style={{ display: "flex", marginTop: 6, fontSize: 17, fontWeight: 800, letterSpacing: 2 }}>{date}</div>}
        {stay && <div style={{ display: "flex", marginTop: 2, fontSize: 15, fontWeight: 500 }}>{stay}</div>}
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        padding: "24px 28px",
        borderRadius: 28,
        background: COLORS.paperMuted,
      }}
    >
      <div style={{ display: "flex", fontSize: 24, fontWeight: 500, color: "rgba(20,35,59,0.66)" }}>{label}</div>
      <div style={{ display: "flex", marginTop: 6, fontSize: 40, fontWeight: 800, color: COLORS.ink, letterSpacing: -1 }}>
        {value}
      </div>
    </div>
  );
}

/** 회고 카드 PNG. 그리기에 실패하면 null (권한 검사는 라우트에서) */
export async function recapPng({ trip, points, legs, expenses }: RecapData, locale: Locale): Promise<ArrayBuffer | null> {
  const t = makeT(locale);
  const intl = intlLocale(locale);

  // 기록 탭과 같은 날 수 계산
  const n = nights(trip);
  const dayCount = n !== null ? n + 1 : Math.max(1, ...points.map((p) => p.day_number ?? 1));
  const stats = tripStats(points, legs, expenses, dayCount);
  const best = topRated(points).map((p) => ({
    id: p.id,
    name: clip(p.name, 18),
    rating: p.rating ?? 0,
    review: p.review?.trim() ? `“${clip(p.review, 30)}”` : null,
  }));
  // 후보함(Day 없음)은 빼고 방문 순서대로
  const visited = points
    .filter((p) => p.day_number != null)
    .sort((a, b) => a.day_number! - b.day_number! || (a.visit_order ?? 99) - (b.visit_order ?? 99))
    .slice(0, 10)
    .map((p) => clip(p.name, 14));

  const cover = await loadCover(trip);
  const title = clip(trip.title, 36);
  const titleSize = fitSize(title, { width: W - PAD * 2 - 280, lines: 2, max: 68, min: 44 });
  const place = joinDots([trip.country && t(trip.country), trip.region && t(trip.region)]);
  const dateLine = joinDots([formatRange(trip, locale), stayLabel(trip, locale)]);
  const tiles = [
    { label: t("방문한 곳"), value: t("{n}곳", { n: stats.places }) },
    { label: t("이동 거리"), value: `${stats.distanceKm.toLocaleString(intl)}km` },
    {
      label: t("총 지출"),
      value: new Intl.NumberFormat(intl, { style: "currency", currency: "KRW" }).format(Math.round(stats.spendKrw)),
    },
  ];
  const label = t("여행 회고");
  const bestLabel = t("별점 높은 곳");
  const visitedLabel = t("다녀온 곳");

  const card = (
    <div style={{ ...frame(W, RECAP_SIZE.height, COLORS.paper), flexDirection: "column" }}>
      {/* 표지 사진 띠 */}
      <div style={{ display: "flex", position: "relative", width: W, height: BAND }}>
        <CoverLayer cover={cover} width={W} height={BAND} />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: W,
            height: BAND,
            display: "flex",
            backgroundImage: "linear-gradient(180deg, rgba(14,24,40,0.5) 0%, rgba(14,24,40,0) 40%, rgba(14,24,40,0.25) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 52,
            left: PAD,
            display: "flex",
            padding: "10px 24px",
            borderRadius: 999,
            background: "rgba(251,247,241,0.94)",
            color: COLORS.ink,
            fontSize: 26,
            fontWeight: 800,
          }}
        >
          {label}
        </div>
      </div>

      <Stamp trip={trip} locale={locale} />

      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: `40px ${PAD}px 44px` }}>
        {/* 도장 자리를 비워 둔 제목 영역 */}
        <div style={{ display: "flex", flexDirection: "column", width: W - PAD * 2 - 280 }}>
          <div
            style={{
              display: "flex",
              fontSize: titleSize,
              fontWeight: 800,
              color: COLORS.ink,
              lineHeight: 1.15,
              letterSpacing: -1.5,
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", marginTop: 14, fontSize: 28, fontWeight: 500, color: "rgba(20,35,59,0.72)" }}>
            {dateLine}
          </div>
          {place && (
            <div style={{ display: "flex", marginTop: 4, fontSize: 28, fontWeight: 500, color: "rgba(20,35,59,0.72)" }}>
              {place}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 18, marginTop: 36 }}>
          {tiles.map((tile) => (
            <Tile key={tile.label} label={tile.label} value={tile.value} />
          ))}
        </div>

        {best.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 36 }}>
            <div style={{ display: "flex", fontSize: 24, fontWeight: 800, color: COLORS.primary, letterSpacing: 1 }}>
              {bestLabel}
            </div>
            {best.map((p, i) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  paddingTop: 14,
                  paddingBottom: 14,
                  borderBottom: i < best.length - 1 ? "2px solid #e8dfd2" : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    background: COLORS.ink,
                    color: "#fff",
                    fontSize: 24,
                    fontWeight: 800,
                  }}
                >
                  {String(i + 1)}
                </div>
                <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", fontSize: 32, fontWeight: 800, color: COLORS.ink }}>{p.name}</div>
                    <Stars value={p.rating} size={28} color={COLORS.sand} />
                  </div>
                  {p.review && (
                    <div style={{ display: "flex", marginTop: 4, fontSize: 26, fontWeight: 500, color: "rgba(20,35,59,0.72)" }}>
                      {p.review}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 별점을 아직 안 남겼으면 다녀온 곳 이름을 칩으로 */}
        {best.length === 0 && visited.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 36 }}>
            <div style={{ display: "flex", fontSize: 24, fontWeight: 800, color: COLORS.primary, letterSpacing: 1 }}>
              {visitedLabel}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 20 }}>
              {visited.map((name, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    padding: "10px 22px",
                    borderRadius: 999,
                    border: "2px solid #e8dfd2",
                    background: "#fff",
                    color: COLORS.ink,
                    fontSize: 26,
                    fontWeight: 500,
                  }}
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flex: 1, minHeight: 20 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Wordmark size={28} color={COLORS.ink} />
          <div style={{ display: "flex", width: 120, height: 8, borderRadius: 4, background: COLORS.coral }} />
        </div>
      </div>
    </div>
  );

  return renderPng(card, RECAP_SIZE, [
    title,
    dateLine,
    place,
    label,
    bestLabel,
    visitedLabel,
    "Triplan0123456789",
    ...tiles.flatMap((x) => [x.label, x.value]),
    ...best.flatMap((p) => [p.name, p.review]),
    ...visited,
    // 도장 글자
    trip.country && t(trip.country).toUpperCase(),
    trip.region && t(trip.region),
    trip.title,
    stayLabel(trip, locale),
    ".…",
  ]);
}
