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

async function parse<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.error ?? `${label} failed`, res.status);
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
