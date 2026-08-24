export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${url} failed`);
  return res.json();
}

async function apiSend<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${url} failed`);
  return res.json();
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
