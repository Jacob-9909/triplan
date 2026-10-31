import { useId } from "react";
import { format, parseISO } from "date-fns";
import type { Trip } from "@/lib/types";
import { flagOf } from "@/data/world";
import { stayLabel } from "@/features/ui/dates";

/** 지도 핀과 같은 계열의 잉크색 (흰 배경 대비 4.5:1 이상) */
const INKS = ["#cc4126", "#0d6b63", "#2f5d8a", "#6d5bd0", "#a16207", "#c2417a"];

/** 여행 id 로 정해지는 값: 같은 여행은 늘 같은 도장 */
function seed(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

type StampTrip = Pick<Trip, "id" | "title" | "country" | "region" | "start_date" | "end_date">;

/** 다녀온 여행의 여권 도장 (SVG). 모양·색·기울기는 여행 id 로 정해진다 */
export default function TripStamp({ trip, className = "" }: { trip: StampTrip; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const h = seed(trip.id);
  const ink = INKS[h % INKS.length];
  const round = (h >> 3) % 2 === 0;
  const tilt = ((h >> 5) % 19) - 9;
  const place = trip.region || trip.country || trip.title;
  const top = (trip.country || trip.title).toUpperCase();
  const date = trip.start_date ? format(parseISO(trip.start_date), "yyyy.MM.dd") : "";
  const stay = stayLabel(trip) ?? "";
  const flag = flagOf(trip.country);

  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={`${place} 여행 도장 ${date}`}
      className={className}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <defs>
        {/* 찍힌 잉크처럼 가장자리를 살짝 흔든다 */}
        <filter id={`ink-${uid}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={h % 100} />
          <feDisplacementMap in="SourceGraphic" scale="2.5" />
        </filter>
        <path id={`top-${uid}`} d="M 34 100 A 66 66 0 0 1 166 100" />
        <path id={`bottom-${uid}`} d="M 30 100 A 70 70 0 0 0 170 100" />
      </defs>
      <g filter={`url(#ink-${uid})`} fill={ink} stroke={ink} opacity={0.88}>
        {round ? (
          <>
            <circle cx="100" cy="100" r="92" fill="none" strokeWidth="5" />
            <circle cx="100" cy="100" r="80" fill="none" strokeWidth="1.5" />
            <text fontSize="14" fontWeight="800" letterSpacing="3" stroke="none">
              <textPath href={`#top-${uid}`} startOffset="50%" textAnchor="middle">
                {top}
              </textPath>
            </text>
            <text fontSize="12" fontWeight="700" letterSpacing="2" stroke="none" dominantBaseline="hanging">
              <textPath href={`#bottom-${uid}`} startOffset="50%" textAnchor="middle">
                {date}
              </textPath>
            </text>
            <text x="38" y="105" fontSize="12" stroke="none" textAnchor="middle">★</text>
            <text x="162" y="105" fontSize="12" stroke="none" textAnchor="middle">★</text>
          </>
        ) : (
          <>
            <rect x="10" y="34" width="180" height="132" rx="14" fill="none" strokeWidth="5" />
            <rect x="20" y="44" width="160" height="112" rx="8" fill="none" strokeWidth="1.5" />
            <text x="100" y="64" fontSize="11" fontWeight="800" letterSpacing="3" stroke="none" textAnchor="middle">
              {top}
            </text>
            <text x="100" y="146" fontSize="11" fontWeight="700" letterSpacing="2" stroke="none" textAnchor="middle">
              {date}
            </text>
          </>
        )}
        <text x="100" y={round ? 96 : 98} fontSize="30" stroke="none" textAnchor="middle" fill="currentColor">
          {flag}
        </text>
        <text x="100" y={round ? 124 : 122} fontSize="18" fontWeight="800" stroke="none" textAnchor="middle">
          {place.length > 9 ? `${place.slice(0, 8)}…` : place}
        </text>
        {stay && (
          <text x="100" y={round ? 142 : 136} fontSize="10" fontWeight="600" stroke="none" textAnchor="middle">
            {stay}
          </text>
        )}
      </g>
    </svg>
  );
}
