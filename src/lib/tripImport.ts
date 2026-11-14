/**
 * JSON 으로 일정 가져오기: 붙여 넣은 JSON 을 검사해서 저장할 모양으로 바꾼다 (DB 는 건드리지 않는다).
 * 형식은 docs/import-format.md. 서버(POST /api/trips/import)와 미리보기가 같은 함수를 쓴다.
 */
import type { T } from "../i18n/translate.ts";

export const IMPORT_CATEGORIES = ["attraction", "food", "cafe", "stay", "transport", "shopping", "nature", "culture", "etc"] as const;
export const IMPORT_METHODS = ["walk", "transit", "taxi", "rental-car", "bike", "plane", "ferry"] as const;
type Category = (typeof IMPORT_CATEGORIES)[number];
type Method = (typeof IMPORT_METHODS)[number];

export interface ImportPlace {
  name: string;
  category: Category;
  lat: number;
  lng: number;
  start_time: string | null;
  stay_min: number | null;
  memo: string | null;
  link_url: string | null;
}
export interface ImportLeg {
  /** 같은 Day 안 places 의 위치 (from → from+1) */
  from: number;
  method: Method;
  duration_min: number | null;
  distance_km: number;
}
export interface ImportDay {
  day: number;
  area: string | null;
  /** 그날 밤 숙소: places 의 위치 */
  stay: number | null;
  places: ImportPlace[];
  legs: ImportLeg[];
}
export interface ImportTrip {
  title: string | null;
  continent: string | null;
  country: string | null;
  region: string | null;
  start_date: string | null;
  end_date: string | null;
  base_currency: string | null;
}
export interface ImportPlan {
  trip: ImportTrip;
  days: ImportDay[];
  checklist: string[];
}
export interface ImportResult {
  plan: ImportPlan | null;
  errors: string[];
  warnings: string[];
}

const MAX_PLACES = 500;
/** 이보다 가까우면 시각만 있을 때 걷기로 본다 */
const WALK_KM = 1.6;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function realDate(v: unknown): v is string {
  if (typeof v !== "string" || !DATE_RE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (x: number) => (x * Math.PI) / 180;
  const s = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(s)) * 10) / 10;
}

/** 붙여 넣은 글(또는 이미 읽은 객체)을 검사한다. errors 가 있으면 plan 은 null */
export function parseImport(input: unknown, t: T): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let raw = input;
  if (typeof raw === "string") {
    try {
      // 코드 울타리(```json … ```)째 붙여 넣어도 읽는다
      raw = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
    } catch {
      return { plan: null, errors: [t("JSON 형식이 아니에요. 괄호와 따옴표를 확인해 주세요.")], warnings };
    }
  }
  if (!isObj(raw)) return { plan: null, errors: [t("맨 바깥은 {…} 객체여야 해요.")], warnings };
  if (raw.version !== undefined && raw.version !== 1) errors.push(t("지원하는 version 은 1이에요."));

  const tr = isObj(raw.trip) ? raw.trip : {};
  const trip: ImportTrip = {
    title: str(tr.title, 100),
    continent: str(tr.continent, 40),
    country: str(tr.country, 60),
    region: str(tr.region, 60),
    start_date: null,
    end_date: null,
    base_currency: null,
  };
  for (const key of ["start_date", "end_date"] as const) {
    if (tr[key] == null || tr[key] === "") continue;
    if (realDate(tr[key])) trip[key] = tr[key];
    else errors.push(t("trip.{key} 는 YYYY-MM-DD 날짜여야 해요.", { key }));
  }
  if (trip.start_date && trip.end_date && trip.end_date < trip.start_date) errors.push(t("끝나는 날이 시작하는 날보다 빨라요."));
  if (tr.base_currency != null) {
    if (typeof tr.base_currency === "string" && /^[A-Za-z]{3}$/.test(tr.base_currency)) trip.base_currency = tr.base_currency.toUpperCase();
    else errors.push(t("trip.base_currency 는 JPY 같은 세 글자 통화 코드여야 해요."));
  }
  const span =
    trip.start_date && trip.end_date
      ? Math.round((Date.parse(trip.end_date) - Date.parse(trip.start_date)) / 86400000) + 1
      : null;

  if (!Array.isArray(raw.days) || raw.days.length === 0) {
    errors.push(t("days 에 Day 를 하나 이상 넣어 주세요."));
    return { plan: null, errors, warnings };
  }

  const days: ImportDay[] = [];
  const seen = new Set<number>();
  let total = 0;
  raw.days.forEach((d, di) => {
    const at = t("days[{i}]", { i: di });
    if (!isObj(d)) return void errors.push(t("{at}: 객체가 아니에요.", { at }));
    const n = d.day;
    if (!(Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 365)) return void errors.push(t("{at}: day 는 1~365 숫자여야 해요.", { at }));
    const day = n as number;
    if (seen.has(day)) return void errors.push(t("Day {day} 가 두 번 나와요.", { day }));
    seen.add(day);
    if (span !== null && day > span) errors.push(t("Day {day} 는 여행 기간({span}일)을 넘어요.", { day, span }));
    if (!Array.isArray(d.places)) return void errors.push(t("Day {day}: places 목록이 없어요.", { day }));

    const places: ImportPlace[] = [];
    const moves: unknown[] = [];
    d.places.forEach((p, pi) => {
      const where = t("Day {day} {n}번째 장소", { day, n: pi + 1 });
      if (!isObj(p)) return void errors.push(t("{where}: 객체가 아니에요.", { where }));
      const name = str(p.name, 200);
      if (!name) return void errors.push(t("{where}: name 이 없어요.", { where }));
      const lat = p.lat, lng = p.lng;
      if (typeof lat !== "number" || typeof lng !== "number" || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) {
        return void errors.push(t("{name}: lat·lng 좌표가 없거나 틀려요.", { name }));
      }
      let category: Category = "attraction";
      if (p.category != null) {
        if (IMPORT_CATEGORIES.includes(p.category as Category)) category = p.category as Category;
        else warnings.push(t("{name}: 모르는 분류라 attraction 으로 넣어요.", { name }));
      }
      let start_time: string | null = null;
      if (p.time != null && p.time !== "") {
        if (typeof p.time === "string" && TIME_RE.test(p.time)) start_time = p.time;
        else errors.push(t("{name}: time 은 HH:MM 이어야 해요.", { name }));
      }
      let stay_min: number | null = null;
      if (p.stay_min != null) {
        if (Number.isInteger(p.stay_min) && (p.stay_min as number) >= 0 && (p.stay_min as number) <= 1440) stay_min = p.stay_min as number;
        else errors.push(t("{name}: stay_min 은 0~1440 분이어야 해요.", { name }));
      }
      let link_url: string | null = null;
      if (p.link_url != null && p.link_url !== "") {
        if (typeof p.link_url === "string" && /^https?:\/\//i.test(p.link_url.trim())) link_url = p.link_url.trim().slice(0, 1000);
        else warnings.push(t("{name}: link_url 은 http(s) 주소만 넣어요.", { name }));
      }
      places.push({ name, category, lat, lng, start_time, stay_min, memo: str(p.memo, 2000), link_url });
      moves.push(p.move);
    });
    total += places.length;

    // 다음 장소까지의 이동: move 가 있으면 그대로, 없으면 두 시각의 틈과 거리로 정한다
    const legs: ImportLeg[] = [];
    for (let i = 0; i < places.length - 1; i++) {
      const a = places[i], b = places[i + 1];
      const distance_km = distanceKm(a, b);
      const gap = a.start_time && b.start_time ? toMin(b.start_time) - (toMin(a.start_time) + (a.stay_min ?? 60)) : null;
      if (gap !== null && gap < 0) warnings.push(t("Day {day} {name}: 앞 일정과 {min}분 겹쳐요.", { day, name: b.name, min: -gap }));
      const mv = moves[i];
      if (isObj(mv)) {
        const method = IMPORT_METHODS.includes(mv.method as Method) ? (mv.method as Method) : null;
        if (!method) errors.push(t("{name}: move.method 는 {list} 중 하나여야 해요.", { name: a.name, list: IMPORT_METHODS.join(", ") }));
        let min = gap === null ? null : Math.max(0, gap);
        if (mv.min != null) {
          if (Number.isInteger(mv.min) && (mv.min as number) >= 0 && (mv.min as number) <= 1440) min = mv.min as number;
          else errors.push(t("{name}: move.min 은 0~1440 분이어야 해요.", { name: a.name }));
        }
        if (method) legs.push({ from: i, method, duration_min: min, distance_km });
      } else if (gap !== null) {
        legs.push({ from: i, method: distance_km < WALK_KM ? "walk" : "transit", duration_min: Math.max(0, gap), distance_km });
      }
    }

    // 숙소: stay 이름과 같은 장소, 없으면 그날 마지막 stay 분류 장소
    let stay: number | null = null;
    const stayName = str(d.stay, 200);
    if (stayName) {
      const i = places.findIndex((p) => p.name === stayName);
      if (i >= 0) stay = i;
      else warnings.push(t("Day {day}: stay \"{name}\" 와 이름이 같은 장소가 없어요.", { day, name: stayName }));
    } else {
      const i = places.map((p) => p.category).lastIndexOf("stay");
      stay = i >= 0 ? i : null;
    }

    days.push({ day, area: str(d.area, 60), stay, places, legs });
  });
  if (total > MAX_PLACES) errors.push(t("장소는 {max}곳까지 넣을 수 있어요.", { max: MAX_PLACES }));
  if (total === 0 && errors.length === 0) errors.push(t("넣을 장소가 하나도 없어요."));

  const checklist = Array.isArray(raw.checklist)
    ? [...new Set(raw.checklist.map((c) => str(c, 200)).filter((c): c is string => Boolean(c)))].slice(0, 200)
    : [];

  days.sort((a, b) => a.day - b.day);
  return errors.length ? { plan: null, errors, warnings } : { plan: { trip, days, checklist }, errors, warnings };
}
