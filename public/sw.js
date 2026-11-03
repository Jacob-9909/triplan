// 오프라인 보기: 한 번 열어 본 화면과 데이터를 저장해 두고, 연결이 끊기면 저장본을 보여 준다.
// - /_next/static: 파일명에 해시가 붙어 바뀌지 않으므로 저장본 우선
// - 그 밖의 같은 출처 GET(페이지·API·사진): 네트워크 우선, 실패하면 저장본
// - 실시간 알림(/events, /rev)과 로그인 관련 요청은 건드리지 않는다
// 로그아웃하면 AppShell 이 저장본을 모두 지운다.
// ponytail: 오래된 정적 파일을 따로 지우지 않는다. 배포가 잦아 용량이 문제 되면 activate 에서 정리
const STATIC = "triplan-static-v1";
const DATA = "triplan-data-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/\/(events|rev)$/.test(url.pathname) || url.pathname.startsWith("/api/auth")) return;
  if (req.headers.get("accept")?.includes("text/event-stream")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              void caches.open(STATIC).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          void caches.open(DATA).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => (await caches.match(req)) || Response.error())
  );
});
