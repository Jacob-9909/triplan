import type { Metadata } from "next";
import { headers } from "next/headers";
import type { Trip } from "@/lib/types";
import { getPool } from "@/lib/db";
import { findTripByToken } from "@/lib/auth";
import { formatRange, stayLabel, tripPhase } from "@/features/ui/dates";
import { getLocale } from "@/i18n/server";
import { makeT, type Locale } from "@/i18n/translate";
import { clip, fitSize, joinDots, seoulToday, siteOrigin } from "./logic";
import { COLORS, CoverLayer, frame, loadCover, pngResponse, renderPng, Wordmark } from "./parts";

// 공유 링크(/v/…, /t/…) 미리보기: 메타데이터 + 1200×630 이미지.
// 링크는 비공개라 제목·장소·날짜·장소 수만 싣는다 (확인 번호·동행자 이름 등은 넣지 않는다)

export type ShareMode = "view" | "edit";
export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 };

type ShareTrip = Pick<Trip, "id" | "title" | "continent" | "country" | "region" | "start_date" | "end_date" | "cover_image_url"> & {
  /** Day 에 넣은 장소 수 (후보함 제외) */
  places: number;
};

/** 토큰이 그 링크 종류(보기/편집)와 맞을 때만. 없거나 DB 오류면 null */
async function loadShareTrip(token: string, mode: ShareMode): Promise<ShareTrip | null> {
  try {
    const found = await findTripByToken(token);
    if (!found || found.access !== mode) return null;
    const { rows } = await getPool().query<ShareTrip>(
      `SELECT id, title, continent, country, region, start_date, end_date, cover_image_url,
              (SELECT count(*)::int FROM triplan.map_points p WHERE p.trip_id = t.id AND p.day_number IS NOT NULL) AS places
         FROM triplan.trips t WHERE id = $1`,
      [found.tripId]
    );
    return rows[0] ?? null;
  } catch (err) {
    console.error("share preview: trip lookup failed:", err);
    return null;
  }
}

function shareText(trip: ShareTrip, locale: Locale) {
  const t = makeT(locale);
  const place = joinDots([trip.country && t(trip.country), trip.region && t(trip.region)]);
  const dates = trip.start_date ? formatRange(trip, locale) : null;
  const stay = stayLabel(trip, locale);
  const places = trip.places > 0 ? t("장소 {n}곳", { n: trip.places }) : null;
  const p = tripPhase(trip, seoulToday());
  const pill =
    p.phase === "upcoming"
      ? `D-${p.dday}`
      : p.phase === "ongoing"
        ? t("여행 중 · Day {n}", { n: p.dayIndex ?? 1 })
        : p.phase === "past"
          ? t("다녀온 여행")
          : null;
  return {
    place,
    dateLine: joinDots([dates, stay, places]),
    description: joinDots([place, dates, stay, places]),
    pill,
  };
}

/** og:image 를 절대 주소로 만들 기준. SITE_URL, 없으면 요청 헤더 (프록시 뒤면 x-forwarded-*) */
async function siteBase(): Promise<URL | undefined> {
  const h = await headers();
  const origin = siteOrigin({
    siteUrl: process.env.SITE_URL,
    proto: h.get("x-forwarded-proto"),
    forwardedHost: h.get("x-forwarded-host"),
    host: h.get("host"),
  });
  return origin ? new URL(origin) : undefined;
}

/** /v/[token]·/t/[token] 의 generateMetadata */
export async function shareMetadata(token: string, mode: ShareMode): Promise<Metadata> {
  const [trip, locale, metadataBase] = await Promise.all([loadShareTrip(token, mode), getLocale(), siteBase()]);
  // 공유 링크는 비공개: 검색엔진에 올리지 않는다
  const base: Metadata = { metadataBase, robots: { index: false, follow: false } };
  if (!trip) return base;
  const title = `${trip.title} · Triplan`;
  const { description } = shareText(trip, locale);
  return {
    ...base,
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Triplan",
      type: "website",
      locale: locale === "en" ? "en_US" : "ko_KR",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

// 미리보기 이미지는 D-day·제목이 바뀌므로 오래 캐시하지 않는다
const SHARE_CACHE = "public, max-age=600";

/** 알 수 없는 링크·오류일 때: 여행 정보 없는 Triplan 카드 */
function BrandCard({ tagline }: { tagline: string }) {
  const { width, height } = SHARE_IMAGE_SIZE;
  return (
    <div
      style={{
        ...frame(width, height, COLORS.ink),
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: "linear-gradient(160deg, #24365a 0%, #14233b 60%, #0e1828 100%)",
      }}
    >
      <Wordmark size={88} color={COLORS.paper} />
      <div style={{ display: "flex", marginTop: 36, fontSize: 34, fontWeight: 500, color: "rgba(251,247,241,0.78)" }}>
        {tagline}
      </div>
      <div style={{ display: "flex", position: "absolute", left: 0, bottom: 0, width, height: 14, background: COLORS.coral }} />
    </div>
  );
}

async function brandImage(locale: Locale) {
  const tagline = makeT(locale)("가고 싶은 곳부터 함께 짜는 여행까지");
  const png = await renderPng(<BrandCard tagline={tagline} />, SHARE_IMAGE_SIZE, ["Triplan", tagline]);
  // 폰트·렌더 문제로 실패해도 오류 페이지 대신 빈 PNG 라도 준다
  return png ? pngResponse(png, { "Cache-Control": SHARE_CACHE }) : new Response(null, { status: 204 });
}

/** opengraph-image 기본 내보내기에서 부른다 */
export async function shareImage(token: string, mode: ShareMode): Promise<Response> {
  const [trip, locale] = await Promise.all([loadShareTrip(token, mode), getLocale()]);
  if (!trip) return brandImage(locale);

  const { width, height } = SHARE_IMAGE_SIZE;
  const cover = await loadCover(trip);
  const text = shareText(trip, locale);
  const title = clip(trip.title, 40);
  const titleSize = fitSize(title, { width: width - 144, lines: 2, max: 84, min: 54 });

  const card = (
    <div style={frame(width, height, COLORS.ink)}>
      <CoverLayer cover={cover} width={width} height={height} />
      {/* 흰 글씨가 읽히게 아래로 갈수록 어둡게 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          display: "flex",
          backgroundImage:
            "linear-gradient(180deg, rgba(14,24,40,0.45) 0%, rgba(14,24,40,0.1) 30%, rgba(14,24,40,0.55) 62%, rgba(14,24,40,0.92) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 72,
          width: width - 144,
          height: height - 112,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {text.pill ? (
            <div
              style={{
                display: "flex",
                padding: "10px 26px",
                borderRadius: 999,
                background: text.pill.startsWith("D-") ? COLORS.primary : "rgba(251,247,241,0.94)",
                color: text.pill.startsWith("D-") ? "#fff" : COLORS.ink,
                fontSize: 32,
                fontWeight: 800,
              }}
            >
              {text.pill}
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
          <Wordmark size={30} color="#fff" />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: titleSize,
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.12,
              letterSpacing: -1.5,
            }}
          >
            {title}
          </div>
          {text.place && (
            <div style={{ display: "flex", marginTop: 20, fontSize: 34, fontWeight: 800, color: "rgba(255,255,255,0.94)" }}>
              {text.place}
            </div>
          )}
          {text.dateLine && (
            <div style={{ display: "flex", marginTop: 8, fontSize: 30, fontWeight: 500, color: "rgba(255,255,255,0.82)" }}>
              {text.dateLine}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const png = await renderPng(card, SHARE_IMAGE_SIZE, [title, text.place, text.dateLine, text.pill, "Triplan"]);
  return png ? pngResponse(png, { "Cache-Control": SHARE_CACHE }) : brandImage(locale);
}
