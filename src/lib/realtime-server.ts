import { Client } from "pg";

/**
 * 실시간 반영 (서버 쪽).
 * DB 트리거가 여행 데이터가 바뀔 때마다 pg_notify('triplan_trip', '<trip_id>:<table>') 를 보낸다
 * (supabase/migrations/20261031000001_user_role_realtime.sql). 이 프로세스는 LISTEN 전용 연결 하나로
 * 받아서, 그 여행을 보고 있는 SSE 구독자에게 나눠 준다.
 * 풀(getPool) 연결을 LISTEN 에 묶어 두지 않으려고 별도 Client 를 쓴다.
 * node 프로세스 하나 기준이다. 인스턴스를 늘려도 각자 LISTEN 하므로 그대로 동작한다.
 */

type Listener = (table: string) => void;

const subscribers = new Map<string, Set<Listener>>();
let client: Client | null = null;
let connecting: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function dispatch(payload: string | undefined) {
  if (!payload) return;
  const [tripId, table = "trips"] = payload.split(":");
  subscribers.get(tripId)?.forEach((fn) => fn(table));
}

function scheduleReconnect() {
  client = null;
  connecting = null;
  if (retryTimer || subscribers.size === 0) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void ensureListening().then(() => {
      // 끊긴 동안 놓친 변경이 있을 수 있으니 보고 있는 여행 전부 다시 불러오게 한다
      for (const set of subscribers.values()) set.forEach((fn) => fn("*"));
    });
  }, 3000);
}

async function ensureListening() {
  if (client) return;
  if (connecting) return connecting;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  const isLocal = /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url);
  const c = new Client({ connectionString: url, ssl: isLocal ? false : { rejectUnauthorized: false } });
  connecting = (async () => {
    try {
      await c.connect();
      c.on("notification", (msg) => dispatch(msg.payload));
      c.on("error", (err) => {
        console.error("realtime LISTEN connection error:", err.message);
        c.end().catch(() => null);
        scheduleReconnect();
      });
      c.on("end", () => {
        if (client === c) scheduleReconnect();
      });
      await c.query("LISTEN triplan_trip");
      client = c;
    } catch (err) {
      console.error("realtime LISTEN failed:", (err as Error).message);
      c.end().catch(() => null);
      scheduleReconnect();
      throw err;
    } finally {
      connecting = null;
    }
  })();
  return connecting;
}

/** 여행 변경 구독. 반환값을 부르면 구독 해제 */
export async function subscribeTrip(tripId: string, fn: Listener): Promise<() => void> {
  let set = subscribers.get(tripId);
  if (!set) subscribers.set(tripId, (set = new Set()));
  set.add(fn);
  const unsubscribe = () => {
    const s = subscribers.get(tripId);
    if (!s) return;
    s.delete(fn);
    if (s.size === 0) subscribers.delete(tripId);
  };
  try {
    await ensureListening();
  } catch (err) {
    unsubscribe();
    throw err;
  }
  return unsubscribe;
}
