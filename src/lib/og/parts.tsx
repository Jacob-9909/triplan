import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactElement } from "react";
import { ImageResponse } from "next/og";
import { coverGradient, coverImage } from "@/features/ui/cover";
import { getPool } from "@/lib/db";
import { koreanFonts, OG_FONT } from "./font";

// 링크 미리보기(opengraph-image)와 회고 카드가 같이 쓰는 그림 조각·사진·렌더링

export const COLORS = {
  ink: "#14233b",
  paper: "#fbf7f1",
  paperMuted: "#f1eadf",
  coral: "#e8553d",
  primary: "#cc4126",
  sand: "#e9a23b",
  teal: "#5eead4",
};

export interface Cover {
  /** data: URL. 사진이 없으면 null */
  photo: string | null;
  gradient: string;
}

type CoverTrip = {
  id?: string;
  title: string;
  country: string | null;
  region: string | null;
  continent: string | null;
  cover_image_url?: string | null;
};

/**
 * 직접 고른 커버가 이 여행 장소 사진이면 DB 에서 읽는다.
 * https 주소 커버는 서버가 가져오지 않는다 (아무 주소나 서버에서 요청하게 되는 것을 막으려고) → 기본 사진으로
 */
async function readTripPhoto(trip: CoverTrip): Promise<string | null> {
  const m = trip.cover_image_url?.match(/^\/api\/point-photos\/([0-9a-f-]{36})$/i);
  if (!m || !trip.id) return null;
  try {
    const { rows } = await getPool().query<{ content_type: string; data: Buffer }>(
      "SELECT content_type, data FROM triplan.point_photos WHERE id = $1 AND trip_id = $2",
      [m[1], trip.id]
    );
    return rows[0] ? `data:${rows[0].content_type};base64,${rows[0].data.toString("base64")}` : null;
  } catch {
    return null;
  }
}

const photoCache = new Map<string, Promise<string | null>>();
const MAX_PHOTOS = 12;

/** 로컬 사진(public/backgrounds/…jpg)을 읽어 data URL 로. 이미지 렌더러는 상대 경로를 못 읽는다 */
async function readPhoto(path: string): Promise<string | null> {
  try {
    // public/ 은 배포 때 통째로 복사되므로(deploy.sh) 빌드 추적(standalone)에 사진을 또 담지 않는다
    const file = await readFile(
      join(/* turbopackIgnore: true */ process.cwd(), "public", ...path.split("/").filter(Boolean))
    );
    return `data:image/jpeg;base64,${file.toString("base64")}`;
  } catch (err) {
    console.warn("og cover photo missing:", path, err);
    return null;
  }
}

/** CoverPhoto 와 같은 순서로 고른 표지: 도시 사진 → 제목 속 도시 → 나라 사진 → 대륙 그라디언트 */
export async function loadCover(trip: CoverTrip): Promise<Cover> {
  const gradient = coverGradient(trip.continent);
  const own = await readTripPhoto(trip);
  if (own) return { photo: own, gradient };
  const path = coverImage({ country: trip.country, city: trip.region, title: trip.title });
  // 사진 목록은 코드에 고정돼 있지만, 경로가 public/backgrounds 밖으로 나가지 않게 한 번 더 막는다
  if (!path || !/^\/backgrounds\/[\w/-]+\.jpe?g$/.test(path)) return { photo: null, gradient };
  let pending = photoCache.get(path);
  if (!pending) {
    pending = readPhoto(path);
    photoCache.set(path, pending);
    if (photoCache.size > MAX_PHOTOS) photoCache.delete(photoCache.keys().next().value!);
  }
  return { photo: await pending, gradient };
}

/** 표지 사진(또는 그라디언트)을 꽉 채워 까는 층 */
export function CoverLayer({ cover, width, height }: { cover: Cover; width: number; height: number }) {
  const box = { position: "absolute", top: 0, left: 0, width, height } as const;
  return cover.photo ? (
    // eslint-disable-next-line @next/next/no-img-element -- next/og 이미지 렌더러 안의 <img>
    <img src={cover.photo} alt="" width={width} height={height} style={{ ...box, objectFit: "cover" }} />
  ) : (
    <div style={{ ...box, display: "flex", backgroundImage: cover.gradient }} />
  );
}

/** 앱 아이콘(src/app/icon.svg)과 같은 그림 */
export function LogoMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512">
      <rect width="512" height="512" rx="116" fill={COLORS.ink} />
      <path
        d="M96 396c40-20 74-6 104-26s38-58 56-80"
        fill="none"
        stroke={COLORS.teal}
        strokeWidth="18"
        strokeLinecap="round"
        strokeDasharray="2 34"
      />
      <path
        d="M300 96c-58 0-104 45-104 101 0 76 104 179 104 179s104-103 104-179c0-56-46-101-104-101z"
        fill={COLORS.paper}
      />
      <circle cx="300" cy="197" r="40" fill={COLORS.coral} />
    </svg>
  );
}

export function Wordmark({ size, color }: { size: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: Math.round(size * 0.32) }}>
      <LogoMark size={Math.round(size * 1.3)} />
      <div style={{ display: "flex", fontSize: size, fontWeight: 800, color, letterSpacing: -0.5 }}>Triplan</div>
    </div>
  );
}

const STAR = "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26";

/** 별점 (글꼴에 ★ 가 없을 수 있어 SVG 로 그린다) */
export function Stars({ value, size, color }: { value: number; size: number; color: string }) {
  return (
    <div style={{ display: "flex", gap: Math.round(size * 0.12) }}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24">
          <polygon
            points={STAR}
            fill={i < value ? color : "none"}
            stroke={color}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </div>
  );
}

/**
 * PNG 를 끝까지 그려 본 뒤 바이트로 돌려준다. 실패하면 null.
 * ImageResponse 는 스트림 중간에 실패하면 깨진 응답이 나가므로, 미리 그려서 대체 이미지로 넘어갈 수 있게 한다.
 * texts: 그림에 들어가는 모든 글자 (한글 폰트 서브셋용)
 */
export async function renderPng(
  element: ReactElement,
  size: { width: number; height: number },
  texts: (string | null | undefined)[]
): Promise<ArrayBuffer | null> {
  const fonts = await koreanFonts(...texts);
  try {
    return await new ImageResponse(element, { ...size, fonts }).arrayBuffer();
  } catch (err) {
    console.error("og image render failed:", err);
    return null;
  }
}

export function pngResponse(png: ArrayBuffer, headers: Record<string, string> = {}) {
  return new Response(png, {
    headers: { "Content-Type": "image/png", "Content-Length": String(png.byteLength), ...headers },
  });
}

/** 루트 상자 공통 스타일 */
export function frame(width: number, height: number, background: string) {
  return {
    width,
    height,
    display: "flex",
    position: "relative",
    background,
    fontFamily: OG_FONT,
  } as const;
}
