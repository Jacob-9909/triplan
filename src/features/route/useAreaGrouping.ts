"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MapPoint, Trip } from "@/lib/types";
import { apiPost } from "@/lib/api";
import type { Locale } from "@/i18n/translate";
import { groupAreas } from "./areas";
import { DEFAULT_STAY } from "./schedule";
import { groupKey, missingKeys, namesFor } from "./areaName";
import { AREA_COLORS, LOOSE_COLOR } from "./AreaGroups";

/**
 * 후보함 구역 제안: 묶기는 여기서 계산하고, 이름만 서버(NIM)에 묻는다.
 * 구역 이름은 구역(장소 묶음)마다 기억한다. 한 구역을 옮겨도 남은 구역 이름은 그대로고, 새로 생긴 구역만 묻는다
 */
export function useAreaGrouping({
  tripId,
  trip,
  points,
  active,
  locale,
}: {
  tripId: string;
  trip: Trip | null;
  /** 후보함 장소 */
  points: MapPoint[];
  /** 구역 보기를 켰고 후보함을 보고 있을 때만 계산한다 */
  active: boolean;
  locale: Locale;
}) {
  const areas = useMemo(() => (active ? groupAreas(points, DEFAULT_STAY) : null), [active, points]);
  const groupKeys = useMemo(() => areas?.groups.map((g) => groupKey(g.points.map((p) => p.id))) ?? [], [areas]);
  const [nameCache, setNameCache] = useState<Record<string, string | null>>({});
  const naming = useRef(new Set<string>());

  useEffect(() => {
    if (!areas) return;
    const missing = missingKeys(groupKeys, nameCache, naming.current);
    if (missing.length === 0) return;
    missing.forEach((k) => naming.current.add(k));
    // 서버 한도(한 번에 구역 12개, 구역당 이름 30개·100자)에 맞춰 나눠 묻는다. 넘기면 400 이라 모두 "구역 N" 이 된다
    for (let start = 0; start < missing.length; start += 12) {
      const keys = missing.slice(start, start + 12);
      const groups = keys.map((k) => areas.groups[groupKeys.indexOf(k)]);
      const done = (names: (string | null)[]) => {
        keys.forEach((k) => naming.current.delete(k));
        setNameCache((prev) => ({ ...prev, ...Object.fromEntries(keys.map((k, i) => [k, names[i] ?? null])) }));
      };
      void apiPost<{ names: (string | null)[] }>("/api/areas/name", {
        trip_id: tripId,
        locale,
        region: [trip?.country, trip?.region].filter(Boolean).join(" "),
        groups: groups.map((g) => ({
          places: g.points.slice(0, 30).map((p) => p.name.slice(0, 100)),
          lat: g.center.lat,
          lng: g.center.lng,
        })),
      })
        .then((r) => done(r.names))
        .catch(() => done([]));
    }
  }, [groupKeys.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  /** 구역마다 핀 색 (어디에도 안 맞는 곳은 회색) */
  const pinColors = useMemo(() => {
    if (!areas) return undefined;
    const out: Record<string, string> = {};
    areas.groups.forEach((g, i) => g.points.forEach((p) => (out[p.id] = AREA_COLORS[i % AREA_COLORS.length])));
    for (const l of areas.loose) out[l.point.id] = LOOSE_COLOR;
    return out;
  }, [areas]);

  return {
    areas,
    names: namesFor(groupKeys, nameCache),
    pinColors,
    /** 옮기기 전에 잡아 두는 이름. 대체 이름("구역 N")은 null */
    nameOf: (ids: string[]) => nameCache[groupKey(ids)] ?? null,
  };
}
