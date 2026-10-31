"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { NotebookPen } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { MapPoint, Trip, WishlistPlace } from "@/lib/types";
import { getTripCenter } from "@/data/countryCenters";
import { TripMap } from "@/features/map";
import { CATEGORIES, PointBadge } from "@/features/map/pointStyle";
import { formatMoney } from "@/features/expenses/categories";
import { nights } from "@/features/ui/dates";
import TripStamp from "./TripStamp";
import { Stars } from "./RecordTab";

type PastTrip = Pick<Trip, "id" | "title" | "continent" | "country" | "region" | "start_date" | "end_date"> & {
  place_count: number;
  spend_krw: number;
};

type ReviewedPlace = Pick<MapPoint, "id" | "trip_id" | "name" | "category" | "color" | "lat" | "lng" | "rating" | "review"> & {
  trip_title: string;
  country: string | null;
  region: string | null;
};

const VISITED = "#0d6b63";
const WISHED = "#c2417a";

function pin(id: string, name: string, color: string, memo: string, at: { lat: number; lng: number }): MapPoint {
  return { id, trip_id: "", name, category: "etc", color, memo, lat: at.lat, lng: at.lng, day_number: null, visit_order: null, created_at: "" };
}

/** 다녀온 여행 모아 보기: 다녀온 곳·가고 싶은 곳 지도, 여권 도장, 내가 평가한 장소 */
export default function Archive() {
  const [data, setData] = useState<{ trips: PastTrip[]; places: ReviewedPlace[] } | null>(null);
  const [wishes, setWishes] = useState<WishlistPlace[]>([]);
  const [category, setCategory] = useState<MapPoint["category"] | "all">("all");

  useEffect(() => {
    apiGet<{ trips: PastTrip[]; places: ReviewedPlace[] }>("/api/archive")
      .then(setData)
      .catch(() => setData({ trips: [], places: [] }));
    apiGet<WishlistPlace[]>("/api/wishlist").then(setWishes).catch(() => null);
  }, []);

  const trips = useMemo(() => data?.trips ?? [], [data]);
  const places = useMemo(() => data?.places ?? [], [data]);
  const countries = new Set(trips.map((t) => t.country).filter(Boolean)).size;
  const totalDays = trips.reduce((sum, t) => sum + (nights(t) ?? 0) + 1, 0);

  const mapPoints = useMemo(() => {
    const visited = trips.flatMap((t) => {
      const at = getTripCenter(t.country, t.region);
      return at ? [pin(`trip-${t.id}`, t.title, VISITED, `다녀옴 · ${t.start_date ?? ""}`, at)] : [];
    });
    const done = new Set(trips.map((t) => t.id));
    const wished = wishes
      .filter((w) => w.lat !== null && w.lng !== null && !(w.trip_id && done.has(w.trip_id)))
      .map((w) => pin(`wish-${w.id}`, w.name, WISHED, "가고 싶은 곳", { lat: w.lat!, lng: w.lng! }));
    return [...visited, ...wished];
  }, [trips, wishes]);

  const usedCategories = CATEGORIES.filter((c) => places.some((p) => p.category === c.id));
  const shownPlaces = places.filter((p) => category === "all" || p.category === category);

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6">
      <div className="mt-3 md:mt-8">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">여행 기록</h1>
        <p className="mt-1 text-sm text-foreground/65">
          {data === null ? "불러오는 중…" : `${countries}개 나라 · ${trips.length}번의 여행 · 모두 ${totalDays}일`}
        </p>
      </div>

      <div className="mt-5 overflow-hidden rounded-[var(--radius-card)] shadow-card">
        <TripMap
          points={mapPoints}
          showRoute={false}
          numbered={false}
          heightClass="h-56 md:h-80"
          onPointClick={(id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" })}
        />
      </div>
      <p className="mt-2 flex gap-4 px-1 text-xs text-foreground/68">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: VISITED }} /> 다녀온 곳
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: WISHED }} /> 가고 싶은 곳
        </span>
      </p>

      <h2 className="mt-8 text-lg font-bold">여권 도장</h2>
      {data === null ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton aspect-square rounded-[var(--radius-card)]" />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="card mt-3 flex flex-col items-center px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-soft text-mint">
            <NotebookPen size={26} />
          </span>
          <p className="mt-4 font-bold">아직 다녀온 여행이 없어요</p>
          <p className="mt-1.5 max-w-xs text-sm text-foreground/65">여행 날짜가 지나면 여기에 도장이 찍혀요. 여행 화면의 기록 탭에서 일기와 별점을 남길 수 있어요.</p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {trips.map((t, i) => (
            <motion.div
              key={t.id}
              id={`trip-${t.id}`}
              initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.06, type: "spring", bounce: 0.4 }}
            >
              <Link href={`/trips/${t.id}`} className="card card-lift flex flex-col items-center px-3 py-4 text-center">
                <TripStamp trip={t} className="h-32 w-32" />
                <p className="mt-2 line-clamp-1 text-sm font-bold">{t.title}</p>
                <p className="text-xs text-foreground/65">
                  {t.place_count}곳{t.spend_krw > 0 && ` · ₩${formatMoney(t.spend_krw, "KRW")}`}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {places.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-bold">내가 남긴 장소 평가</h2>
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
            {[{ id: "all" as const, label: "전체" }, ...usedCategories].map((c) => (
              <button
                key={c.id}
                aria-pressed={category === c.id}
                onClick={() => setCategory(c.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  category === c.id ? "bg-foreground text-white" : "bg-surface text-foreground/72 shadow-sm ring-1 ring-border-subtle"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {shownPlaces.map((p) => (
              <li key={p.id} className="card flex gap-3 p-4">
                <PointBadge point={p} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-2">
                    <p className="truncate font-semibold">{p.name}</p>
                    <Stars value={p.rating ?? null} size={14} />
                  </div>
                  {p.review && <p className="mt-0.5 text-sm text-foreground/75">{p.review}</p>}
                  <Link href={`/trips/${p.trip_id}`} className="mt-1 block truncate text-xs text-foreground/65 hover:text-primary-strong">
                    {p.trip_title} · {[p.country, p.region].filter(Boolean).join(" ")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
