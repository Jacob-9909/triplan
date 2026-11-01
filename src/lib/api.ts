import { translate, type Locale } from "@/i18n/translate";

/**
 * 공유 링크(/t/…, /v/…)로 들어온 경우 모든 API 요청에 토큰을 실어 보낸다.
 * 관리자는 쿠키로 인증되므로 토큰이 없다.
 */
let tripToken: string | null = null;

export function setTripToken(token: string | null) {
  tripToken = token;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

function headers(json: boolean): HeadersInit {
  const h: Record<string, string> = {};
  if (json) h["Content-Type"] = "application/json";
  if (tripToken) h["x-trip-token"] = tripToken;
  return h;
}

/** 서버 오류 문구는 한국어다. 사전에 그대로 없으면 숫자를 {0},{1}… 로 바꿔 한 번 더 찾는다 */
export function translateError(lang: Locale, msg: string) {
  const exact = translate(lang, msg);
  if (exact !== msg || lang === "ko") return exact;
  const nums: string[] = [];
  const key = msg.replace(/\d+(\.\d+)?/g, (n) => `{${nums.push(n) - 1}}`);
  return translate(lang, key, Object.fromEntries(nums.entries()));
}

async function parse<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    // 서버 오류 문구는 한국어다. 화면 언어가 영어면 사전으로 옮긴다
    const lang = typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "ko";
    throw new ApiError(translateError(lang, body?.error ?? `${label} failed`), res.status);
  }
  return res.json();
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store", headers: headers(false) });
  return parse<T>(res, `GET ${url}`);
}

async function apiSend<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: headers(body !== undefined),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return parse<T>(res, `${method} ${url}`);
}

export function apiPost<T>(url: string, body: unknown): Promise<T> {
  return apiSend<T>(url, "POST", body);
}

export function apiPatch<T = { ok: true }>(url: string, body: unknown): Promise<T> {
  return apiSend<T>(url, "PATCH", body);
}

export function apiDelete<T = { ok: true }>(url: string): Promise<T> {
  return apiSend<T>(url, "DELETE");
}

/** multipart 업로드 (Content-Type은 브라우저가 boundary와 함께 정한다) */
export async function apiUpload<T>(url: string, form: FormData): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: headers(false), body: form });
  return parse<T>(res, `POST ${url}`);
}

/** 헤더를 못 붙이는 요청(<img src>, EventSource)용. 공유 링크면 "?t=<토큰>", 아니면 빈 문자열 */
export function tokenQuery() {
  return tripToken ? `?t=${encodeURIComponent(tripToken)}` : "";
}

/** <img src>용 사진 주소. 공유 링크면 토큰을 쿼리로 붙인다 */
export function photoUrl(id: string) {
  return `/api/point-photos/${id}${tokenQuery()}`;
}
