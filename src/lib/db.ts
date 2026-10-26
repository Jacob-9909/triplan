import { Pool, types } from "pg";

// date는 시간대 변환 없이 'YYYY-MM-DD' 문자열 그대로, numeric은 숫자로 받는다
types.setTypeParser(1082, (v: string) => v);
types.setTypeParser(1700, (v: string) => parseFloat(v));

let pool: Pool | null = null;

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not configured");
    }
    const url = process.env.DATABASE_URL;
    // 로컬 개발 DB(docker 등)는 SSL을 쓰지 않는다
    const isLocal = /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);
    pool = new Pool({
      connectionString: url,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pool;
}

export function jsonError(message: string, status = 500) {
  return Response.json({ error: message }, { status });
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Row = Record<string, unknown>;
