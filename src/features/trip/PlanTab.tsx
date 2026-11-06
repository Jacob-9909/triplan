"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { addDays, format, parseISO } from "date-fns";
import { Maximize2, Minimize2 } from "lucide-react";
import type { Expense, MapPoint, RouteLeg, RouteOption, TravelDoc, Trip, TripDay } from "@/lib/types";
import { ApiError, apiGet, apiPatch } from "@/lib/api";
import { useTripChanges } from "@/lib/realtime";
import { TripMap, AddPointDialog } from "@/features/map";
import PlaceSearch, { type PickedPlace } from "@/features/map/PlaceSearch";
import { getTripCenter } from "@/data/countryCenters";
import DayTabs, { BIN_DAY } from "@/features/route/DayTabs";
import { optimizeOrder } from "@/features/route/optimize";
import { useRouteFetcher } from "@/features/route/useRouteFetcher";
import DayPlan from "@/features/route/DayPlan";
import LegCard from "@/features/route/LegCard";
import LegSheetBody from "@/features/route/LegSheet";
import AreaGroups from "@/features/route/AreaGroups";
import { useAreaGrouping } from "@/features/route/useAreaGrouping";
import { mergeArea } from "@/features/route/areaName";
import { chipMethods } from "@/features/route/routeOptions";
import { fetchDirections } from "@/features/route/directions";
import { adjacentLegs } from "@/features/route/schedule";
import NowCard from "@/features/route/NowCard";
import { useForecast } from "@/features/route/weather";
import { useOpeningHours } from "@/features/route/useOpeningHours";
import DayBookings from "@/features/prep/DayBookings";
import Sheet from "@/features/ui/Sheet";
import { nights } from "@/features/ui/dates";
import { usePrefs } from "@/i18n/I18nProvider";
import PlaceDetail from "./PlaceDetail";
import { updateLeg } from "./useTripData";
import type { PointActions } from "./usePointActions";

/** 휴대폰 지도 높이 단계 (화면 높이 %). 손잡이를 끌거나 눌러 바꾼다 */
const MOBILE_SNAPS = [28, 42, 64];
const MOBILE_MIN_PX = 180;

function readStored<T>(key: string, parse: (v: string | null) => T): T {
  try {
    return parse(typeof window !== "undefined" ? localStorage.getItem(key) : null);
  } catch {
    return parse(null);
  }
}
function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

/**
 * 일정 탭: Day 고르기 + 지도 + 하루 일정(또는 후보함·구역 묶기) + 장소·구간 편집 창.
 * 휴대폰에서는 지도를 탭 바 아래에 붙여 두고 목록이 그 아래로 지나가게 한다 (지도와 일정을 함께 보기).
 */
export default function PlanTab({
  tripId,
  trip,
  points,
  legs,
  savedRoutes,
  setLegs,
  setRouteOptions,
  actions,
  canEdit,
  day,
  onDayChange,
  todayDay,
  past,
  expenses,
  docs,
}: {
  tripId: string;
  trip: Trip;
  points: MapPoint[];
  legs: RouteLeg[];
  savedRoutes: RouteOption[];
  setLegs: Dispatch<SetStateAction<RouteLeg[]>>;
  setRouteOptions: Dispatch<SetStateAction<RouteOption[]>>;
  actions: PointActions;
  canEdit: boolean;
  day: number;
  onDayChange: (day: number) => void;
  todayDay: number | null;
  /** 다녀온 여행: 경로를 새로 받지 않는다 */
  past: boolean;
  expenses: Expense[];
  /** 예약 (그날 걸린 항공·숙소를 일정 위에) */
  docs: TravelDoc[];
}) {
  const { t, locale, df } = usePrefs();
  const inBin = day === BIN_DAY;
  const dayPoints = useMemo(() => actions.pointsOf(inBin ? null : day), [points, day, inBin]); // eslint-disable-line react-hooks/exhaustive-deps
  // 후보함은 순서가 없으니 이동 구간도 없다
  const dayLegs = useMemo(() => (inBin ? [] : adjacentLegs(dayPoints, legs)), [legs, dayPoints, inBin]);
  const binCount = points.filter((p) => p.day_number == null).length;
  const tripDays = (nights(trip) ?? -1) + 1;
  const dateOf = (d: number) => (trip.start_date ? format(addDays(parseISO(trip.start_date), d - 1), "yyyy-MM-dd") : null);

  // Day 별 구역 이름 (trip_days.area). 일기 칸은 기록 탭이 따로 다룬다
  const [dayRecords, setDayRecords] = useState<TripDay[]>([]);
  const loadDays = useCallback(
    () =>
      apiGet<TripDay[]>(`/api/trip-days?trip_id=${tripId}`)
        .then(setDayRecords)
        .catch(() => {}),
    [tripId]
  );
  useEffect(() => {
    void loadDays();
  }, [loadDays]);
  useTripChanges(tripId, ["trip_days"], () => void loadDays());
  const areaByDay = useMemo(
    () => Object.fromEntries(dayRecords.filter((d) => d.area).map((d) => [d.day_number, d.area!])) as Record<number, string>,
    [dayRecords]
  );
  async function saveArea(d: number, area: string | null) {
    setDayRecords((prev) =>
      prev.some((r) => r.day_number === d)
        ? prev.map((r) => (r.day_number === d ? { ...r, area } : r))
        : [...prev, { id: `local-${d}`, trip_id: tripId, day_number: d, weather: null, mood: null, note: null, area }]
    );
    await apiPatch("/api/trip-days", { trip_id: tripId, day_number: d, area }).catch(() => void loadDays());
  }

  const center = getTripCenter(trip.country, trip.region);
  const forecast = useForecast(center?.lat, center?.lng, trip.start_date, trip.end_date);

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  /** 펼친 구간: 지도에 다른 이동수단 경로를 흐리게 보여 준다 */
  const [selectedLegId, setSelectedLegId] = useState<string | null>(null);
  const [pendingLatLng, setPendingLatLng] = useState<{ lat: number; lng: number } | null>(null);
  /** 지도 POI 라벨이나 검색 결과로 미리 채울 장소 정보 */
  const [poiPrefill, setPoiPrefill] = useState<{ name: string; category: MapPoint["category"] } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [legEditId, setLegEditId] = useState<string | null>(null);
  const detailPoint = points.find((p) => p.id === detailId) ?? null;
  const editingLeg = legs.find((l) => l.id === legEditId) ?? null;

  // 지도 크기. 데스크톱은 크게 보기(일정은 지도 아래), 휴대폰은 높이 단계. 이 기기에만 기억한다
  // ponytail: 서버 렌더는 비행기 로딩 화면만 그리므로 첫 값을 바로 localStorage 에서 읽어도 화면이 어긋나지 않는다
  const [mapBig, setMapBig] = useState(() => readStored("triplan:mapBig", (v) => v === "1"));
  const [snap, setSnap] = useState(() =>
    readStored("triplan:mapSnap", (v) => {
      const n = Number(v);
      return v != null && Number.isInteger(n) && n >= 0 && n < MOBILE_SNAPS.length ? n : 1;
    })
  );
  function toggleMapBig() {
    setMapBig((big) => {
      store("triplan:mapBig", big ? "0" : "1");
      return !big;
    });
  }
  function chooseSnap(i: number) {
    setSnap(i);
    store("triplan:mapSnap", String(i));
  }

  // 후보함 구역 제안
  const [areaOpen, setAreaOpen] = useState(false);
  const grouping = useAreaGrouping({ tripId, trip, points: dayPoints, active: areaOpen && inBin, locale });
  const [movingArea, setMovingArea] = useState<number | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  /** 동선 정리 직후 되돌리기용: 정리 전·후 순서 */
  const [undo, setUndo] = useState<{ day: number; before: string[]; after: string[] } | null>(null);
  const canUndo = undo?.day === day && undo.after.join() === dayPoints.map((p) => p.id).join();

  // 실제 경로: 다녀온 여행은 새로 받지 않는다
  const routes = useRouteFetcher({
    tripId,
    legs: dayLegs,
    points,
    options: savedRoutes,
    setOptions: setRouteOptions,
    setLegs,
    enabled: canEdit && !past,
  });

  // 영업시간을 모르는 장소는 OpenStreetMap 에서 조금씩 찾아 둔다 (일정표의 휴무일·영업시간 밖 경고용)
  useOpeningHours({
    points: dayPoints,
    enabled: canEdit && !inBin && !past,
    onFound: (id, hours) => actions.patchLocal(id, { opening_hours: hours }),
  });

  // 구간을 펼치면 비교할 이동수단 경로를 받는다 (한국 대중교통은 이때만)
  const openLeg = dayLegs.find((l) => l.id === selectedLegId);
  useEffect(() => {
    if (!openLeg) return;
    for (const m of chipMethods(openLeg)) routes.ensure(openLeg.id, m);
  }, [openLeg?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 시간이 비어 있는 구간은 우선 거리 기반 추정치로 채운다 (실제 경로가 오면 그 시간으로 바뀐다)
  const estimated = useRef(new Set<string>());
  useEffect(() => {
    if (!canEdit) return;
    for (const leg of dayLegs) {
      if (leg.duration_min != null || estimated.current.has(leg.id)) continue;
      const from = points.find((p) => p.id === leg.from_point_id);
      const to = points.find((p) => p.id === leg.to_point_id);
      if (!from || !to) continue;
      estimated.current.add(leg.id);
      void fetchDirections(from, to, leg.method).then((r) => {
        const patch = { duration_min: r.durationMin, distance_km: r.distanceKm };
        setLegs((prev) => prev.map((l) => (l.id === leg.id ? { ...l, ...patch } : l)));
        void updateLeg(leg.id, patch);
      });
    }
  }, [dayLegs, points, canEdit, setLegs]);

  // 구간 수정: 화면은 바로 바꾸고, 저장은 입력이 멈춘 뒤 한 번만
  const legSaveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const legPending = useRef(new Map<string, Partial<RouteLeg>>());
  function changeLeg(id: string, patch: Partial<RouteLeg>) {
    setLegs((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    // 이동수단·시간·비용을 연달아 바꿔도 모두 저장되게 합쳐 둔다
    legPending.current.set(id, { ...legPending.current.get(id), ...patch });
    const timer = legSaveTimers.current.get(id);
    if (timer) clearTimeout(timer);
    legSaveTimers.current.set(
      id,
      setTimeout(() => {
        const merged = legPending.current.get(id);
        legPending.current.delete(id);
        legSaveTimers.current.delete(id);
        if (merged) void updateLeg(id, merged);
      }, 500)
    );
  }

  /** 이동 거리가 짧은 순서로. 이미 그 순서면 false */
  function handleOptimize() {
    const before = dayPoints.map((p) => p.id);
    const after = optimizeOrder(dayPoints).map((p) => p.id);
    if (before.join() === after.join()) return false;
    setUndo({ day, before, after });
    void actions.reorder(after, inBin);
    return true;
  }

  const mapCenter =
    dayPoints.length > 0
      ? {
          lat: dayPoints.reduce((s, p) => s + p.lat, 0) / dayPoints.length,
          lng: dayPoints.reduce((s, p) => s + p.lng, 0) / dayPoints.length,
        }
      : center;
  const date = inBin ? null : dateOf(day);

  return (
    <div className="space-y-4">
      <DayTabs
        trip={trip}
        value={day}
        onChange={onDayChange}
        forecast={forecast}
        today={todayDay}
        bin={canEdit || binCount > 0 ? binCount : undefined}
        areas={areaByDay}
      />
      {day === todayDay && <NowCard points={dayPoints} legs={dayLegs} />}
      {date && <DayBookings docs={docs} date={date} />}
      <div className={`grid gap-4 lg:gap-6 ${mapBig ? "" : "lg:grid-cols-5 lg:items-start"}`}>
        {/* 휴대폰: 탭 바 아래 붙어 있고 목록이 아래로 지나간다. 데스크톱: 목록을 내려도 지도는 그 자리에 */}
        <div
          className={`sticky top-[calc(3.5625rem-1px)] z-20 -mx-4 bg-background px-4 pb-1 pt-1 md:top-36 md:mx-0 md:px-0 ${
            mapBig ? "lg:static lg:z-auto" : "lg:col-span-3 lg:pb-0 lg:pt-0"
          }`}
        >
          <MapPane
            snap={snap}
            onSnap={chooseSnap}
            mapBig={mapBig}
            onToggleBig={toggleMapBig}
            search={
              canEdit ? (
                <PlaceSearch
                  center={mapCenter}
                  onPick={(place: PickedPlace) => {
                    setPendingLatLng({ lat: place.lat, lng: place.lng });
                    setPoiPrefill({ name: place.name, category: place.category });
                  }}
                />
              ) : null
            }
          >
            {(heightClass) => (
              <TripMap
                points={dayPoints}
                legs={dayLegs}
                routeOptions={routes.options}
                selectedLegId={selectedLegId}
                onRouteOptionClick={canEdit ? routes.choose : undefined}
                pinColors={grouping.pinColors}
                expenses={expenses}
                defaultCenter={center}
                labelCountry={trip.country}
                selectedPointId={selectedPointId}
                focusPointId={selectedPointId}
                onMapClick={
                  canEdit
                    ? (latlng: { lat: number; lng: number }, poi) => {
                        setPendingLatLng(latlng);
                        setPoiPrefill(poi ?? null);
                      }
                    : undefined
                }
                onPointClick={(id: string) => setSelectedPointId(id)}
                onPointOpen={(id: string) => setDetailId(id)}
                editable={canEdit}
                heightClass={heightClass}
              />
            )}
          </MapPane>
        </div>
        <div className={mapBig ? "" : "lg:col-span-2"}>
          {grouping.areas ? (
            <AreaGroups
              groups={grouping.areas.groups}
              loose={grouping.areas.loose}
              names={grouping.names}
              error={moveError}
              days={Array.from({ length: tripDays }, (_, i) => ({
                day: i + 1,
                label: trip.start_date
                  ? `Day ${i + 1} · ${format(addDays(parseISO(trip.start_date), i), t("M/d(E)"), { locale: df })}`
                  : `Day ${i + 1}`,
              }))}
              busy={movingArea}
              onMove={async (gi, target) => {
                setMovingArea(gi);
                setMoveError(null);
                // 옮기면 구역이 다시 계산되므로 이름을 먼저 잡아 둔다. 대체 이름("구역 N")은 저장하지 않는다
                const ids = grouping.areas!.groups[gi].points.map((p) => p.id);
                const name = grouping.nameOf(ids);
                try {
                  await actions.moveGroup(ids, target);
                  const merged = mergeArea(areaByDay[target], name);
                  if (merged !== (areaByDay[target] ?? null)) await saveArea(target, merged);
                } catch (e) {
                  setMoveError(e instanceof ApiError ? e.message : t("저장하지 못했어요."));
                } finally {
                  setMovingArea(null);
                }
              }}
              onOpen={(p) => setDetailId(p.id)}
              onClose={() => setAreaOpen(false)}
            />
          ) : (
            <DayPlan
              points={dayPoints}
              legs={dayLegs}
              bin={inBin}
              date={date}
              onOpen={(p) => {
                setDetailId(p.id);
                // 옆(휴대폰은 위) 지도도 그 장소로 옮겨 간다
                setSelectedPointId(p.id);
              }}
              onReorder={canEdit ? (ids) => void actions.reorder(ids, inBin) : undefined}
              onDelete={canEdit ? actions.removePoint : undefined}
              renderLeg={(leg, from, to) => (
                <LegCard
                  leg={leg}
                  from={from}
                  to={to}
                  options={routes.options.filter((o) => o.leg_id === leg.id)}
                  status={routes.status}
                  open={selectedLegId === leg.id}
                  onToggle={() => setSelectedLegId((cur) => (cur === leg.id ? null : leg.id))}
                  onChoose={canEdit ? (m) => routes.choose(leg.id, m) : undefined}
                  onEdit={canEdit ? () => setLegEditId(leg.id) : undefined}
                />
              )}
              onOptimize={canEdit ? handleOptimize : undefined}
              onUndo={
                canUndo && undo
                  ? () => {
                      void actions.reorder(undo.before, inBin);
                      setUndo(null);
                    }
                  : undefined
              }
              onGroup={canEdit ? () => setAreaOpen(true) : undefined}
              area={inBin ? null : areaByDay[day]}
              onClearArea={canEdit ? () => void saveArea(day, null) : undefined}
            />
          )}
        </div>
      </div>

      {canEdit && (
        <AddPointDialog
          open={pendingLatLng !== null}
          latlng={pendingLatLng}
          prefill={poiPrefill ?? undefined}
          country={trip.country}
          onCancel={() => {
            setPendingLatLng(null);
            setPoiPrefill(null);
          }}
          onSave={async (draft) => {
            if (pendingLatLng) await actions.createPoint(draft, pendingLatLng, inBin ? null : day);
            setPendingLatLng(null);
            setPoiPrefill(null);
          }}
        />
      )}

      <PlaceDetail
        point={detailPoint}
        canEdit={canEdit}
        onClose={() => setDetailId(null)}
        onSave={actions.savePoint}
        dayCount={tripDays}
        onMove={actions.movePoint}
      />

      <Sheet open={editingLeg !== null} onClose={() => setLegEditId(null)} title={t("이동 구간")}>
        {editingLeg && (
          <LegSheetBody
            leg={editingLeg}
            points={points}
            route={routes.options.find((o) => o.leg_id === editingLeg.id && o.method === editingLeg.method)}
            onChange={changeLeg}
            onChoose={routes.choose}
            onDone={() => setLegEditId(null)}
          />
        )}
      </Sheet>
    </div>
  );
}

/**
 * 지도 틀: 검색창·크게 보기(데스크톱)·높이 손잡이(휴대폰).
 * 휴대폰 높이는 CSS 변수 --map-h 로 넘겨, 끄는 동안 지도 높이가 손가락을 따라온다
 */
function MapPane({
  snap,
  onSnap,
  mapBig,
  onToggleBig,
  search,
  children,
}: {
  snap: number;
  onSnap: (i: number) => void;
  mapBig: boolean;
  onToggleBig: () => void;
  search: React.ReactNode;
  children: (heightClass: string) => React.ReactNode;
}) {
  const t = usePrefs().t;
  /** 끄는 중의 높이(px). null 이면 단계 높이 */
  const [dragPx, setDragPx] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startH: number; moved: boolean } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const snapPx = (i: number) => Math.max(MOBILE_MIN_PX, (window.innerHeight * MOBILE_SNAPS[i]) / 100);
  function nearest(px: number) {
    let best = 0;
    MOBILE_SNAPS.forEach((_, i) => {
      if (Math.abs(snapPx(i) - px) < Math.abs(snapPx(best) - px)) best = i;
    });
    return best;
  }

  const heightClass = mapBig
    ? "h-[var(--map-h)] lg:h-[max(76dvh,680px)]"
    : "h-[var(--map-h)] lg:h-[520px]";
  const mapH = dragPx != null ? `${dragPx}px` : `max(${MOBILE_MIN_PX}px, ${MOBILE_SNAPS[snap]}dvh)`;

  return (
    <div ref={boxRef} style={{ "--map-h": mapH } as React.CSSProperties}>
      <div className="relative overflow-hidden rounded-[var(--radius-card)] shadow-card">
        {search && <div className="absolute left-3 right-14 top-3 z-10 sm:right-auto">{search}</div>}
        {children(heightClass)}
        <button
          type="button"
          onClick={onToggleBig}
          aria-pressed={mapBig}
          className="absolute bottom-3 left-3 z-10 hidden items-center gap-1.5 rounded-full bg-surface/95 px-3 py-2 text-xs font-semibold text-foreground shadow-lift backdrop-blur transition hover:bg-surface lg:inline-flex"
        >
          {mapBig ? <Minimize2 size={14} aria-hidden /> : <Maximize2 size={14} aria-hidden />}
          {mapBig ? t("지도 작게 보기") : t("지도 크게 보기")}
        </button>
      </div>
      {/* 휴대폰 높이 손잡이: 끌어서 맞추고, 누르면 다음 단계 */}
      <button
        type="button"
        aria-label={t("지도 높이 조절")}
        className="flex h-6 w-full touch-none items-center justify-center lg:hidden"
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          const h = boxRef.current?.firstElementChild?.getBoundingClientRect().height ?? snapPx(snap);
          drag.current = { startY: e.clientY, startH: h, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dy = e.clientY - d.startY;
          if (Math.abs(dy) > 4) d.moved = true;
          if (d.moved) setDragPx(Math.max(MOBILE_MIN_PX, Math.min(window.innerHeight * 0.8, d.startH + dy)));
        }}
        onPointerUp={() => {
          const d = drag.current;
          drag.current = null;
          if (!d) return;
          if (d.moved && dragPx != null) onSnap(nearest(dragPx));
          else onSnap((snap + 1) % MOBILE_SNAPS.length);
          setDragPx(null);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDragPx(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") onSnap(Math.min(MOBILE_SNAPS.length - 1, snap + 1));
          else if (e.key === "ArrowUp") onSnap(Math.max(0, snap - 1));
          else return;
          e.preventDefault();
        }}
      >
        <span className="h-1.5 w-12 rounded-full bg-foreground/25" aria-hidden />
      </button>
    </div>
  );
}
