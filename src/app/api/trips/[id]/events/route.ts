import { getPool, jsonError, UUID_RE } from "@/lib/db";
import { requireTrip } from "@/lib/auth";
import { subscribeTrip } from "@/lib/realtime-server";

// 연결을 오래 열어 두는 스트림이라 캐시하지 않는다
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;

/**
 * 여행 변경 알림 (Server-Sent Events). 보기 권한이 있으면 구독할 수 있다.
 * 데이터는 보내지 않고 "어느 테이블이 바뀌었는지"만 알린다. 클라이언트는 그 목록을 API로 다시 불러온다.
 *   event: ready  data: <rev>     연결 직후
 *   event: change data: <table>   변경 (table 이 "*" 면 전부 다시 불러오기)
 * 프록시가 스트림을 모아 두면 ready 가 늦게 오므로, 클라이언트는 그때 /rev 폴링으로 바꾼다.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError("invalid id", 400);
  const access = await requireTrip(request, id, "view");
  if (access instanceof Response) return access;

  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (text: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          cleanup();
        }
      };
      let unsubscribe = () => {};
      const heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);
      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      };
      request.signal.addEventListener("abort", () => cleanup());

      try {
        unsubscribe = await subscribeTrip(id, (table) => send(`event: change\ndata: ${table}\n\n`));
      } catch {
        // LISTEN 을 못 하면 스트림을 닫는다. 클라이언트가 폴링으로 바꾼다
        send("event: unavailable\ndata: \n\n");
        cleanup();
        return;
      }
      if (closed) {
        unsubscribe();
        return;
      }
      const { rows } = await getPool()
        .query<{ rev: string }>("SELECT rev::text FROM triplan.trips WHERE id = $1", [id])
        .catch(() => ({ rows: [] as { rev: string }[] }));
      // 첫 조각을 2KB 넘게 채운다: Safari 와 일부 프록시는 1KB 미만이면 모아 두고 보내지 않는다
      send(`: ${" ".repeat(2048)}\nretry: 3000\nevent: ready\ndata: ${rows[0]?.rev ?? "0"}\n\n`);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // no-transform: 압축 미들웨어가 스트림을 모아 두지 않게 / X-Accel-Buffering: nginx 계열 프록시 버퍼링 끄기
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
