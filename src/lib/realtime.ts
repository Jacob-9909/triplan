"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { apiGet, tokenQuery } from "@/lib/api";

/**
 * 실시간 반영 (클라이언트 쪽).
 * 여행 하나에 연결 하나: SSE(/api/trips/[id]/events)로 "어느 테이블이 바뀌었다"는 알림을 받아
 * 구독한 훅들이 자기 데이터를 다시 불러온다. 프록시가 스트림을 막거나 끊으면 /rev 폴링으로 바꾼다.
 * 내가 저장한 변경도 알림으로 돌아오지만, 다시 불러와도 같은 값이라 화면은 그대로다.
 */

export type ChangeTable =
  | "trips"
  | "map_points"
  | "route_legs"
  | "expenses"
  | "checklist_items"
  | "travel_docs"
  | "point_photos";

/** live: SSE 연결됨, polling: 몇 초마다 확인, offline: 연결 안 됨 */
export type SyncStatus = "connecting" | "live" | "polling" | "offline";

const READY_TIMEOUT_MS = 6000;
const POLL_MS = 4000;
/** 순서 바꾸기처럼 저장이 몰려도 한 번만 다시 불러오게 모아 두는 시간 */
const BATCH_MS = 300;
/** SSE 를 다시 시도해 보는 간격 (폴링 중일 때) */
const SSE_RETRY_MS = 60_000;

type Listener = (tables: Set<string>) => void;

class TripChannel {
  listeners = new Set<Listener>();
  statusListeners = new Set<() => void>();
  status: SyncStatus = "connecting";
  private es: EventSource | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private readyTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private pending = new Set<string>();
  private rev: number | null = null;
  private everReady = false;

  constructor(private tripId: string) {}

  start() {
    this.openSse();
    document.addEventListener("visibilitychange", this.onVisible);
  }

  stop() {
    document.removeEventListener("visibilitychange", this.onVisible);
    this.closeSse();
    this.stopPolling();
    for (const t of [this.retryTimer, this.batchTimer]) if (t) clearTimeout(t);
  }

  private setStatus(s: SyncStatus) {
    if (this.status === s) return;
    this.status = s;
    this.statusListeners.forEach((fn) => fn());
  }

  private emit(table: string) {
    this.pending.add(table);
    if (this.batchTimer) return;
    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      const tables = this.pending;
      this.pending = new Set();
      this.listeners.forEach((fn) => fn(tables));
    }, BATCH_MS);
  }

  /** rev 가 바뀌었으면 전부 다시 불러온다 (어느 테이블인지 모를 때) */
  private noteRev(rev: number) {
    if (this.rev !== null && rev !== this.rev) this.emit("*");
    this.rev = rev;
  }

  private openSse() {
    if (typeof EventSource === "undefined") return this.startPolling();
    this.closeSse();
    this.setStatus(this.status === "polling" ? "polling" : "connecting");
    const es = new EventSource(`/api/trips/${this.tripId}/events${tokenQuery()}`);
    this.es = es;
    // ready 가 제때 안 오면 중간 프록시가 스트림을 모아 두는 것으로 보고 폴링으로 바꾼다
    this.readyTimer = setTimeout(() => this.fallBack(), READY_TIMEOUT_MS);
    es.addEventListener("ready", (e) => {
      if (this.readyTimer) clearTimeout(this.readyTimer);
      this.readyTimer = null;
      this.stopPolling();
      // 다시 연결된 경우엔 끊긴 사이 놓친 변경이 있을 수 있으니 전부 다시 불러온다.
      // (rev 는 change 를 받아도 갱신하지 않으므로, 나중에 비교하면 많아야 한 번 더 불러올 뿐 놓치지 않는다)
      const rev = Number((e as MessageEvent).data);
      if (this.everReady) this.emit("*");
      else this.noteRev(rev);
      this.rev = rev;
      this.everReady = true;
      this.setStatus("live");
    });
    es.addEventListener("change", (e) => this.emit(String((e as MessageEvent).data)));
    es.addEventListener("unavailable", () => this.fallBack());
    es.onerror = () => {
      // 브라우저가 알아서 다시 붙지만, 한 번도 ready 를 못 받았거나 완전히 닫혔으면 폴링으로
      if (!this.everReady || es.readyState === EventSource.CLOSED) this.fallBack();
      else this.setStatus("connecting");
    };
  }

  private closeSse() {
    if (this.readyTimer) clearTimeout(this.readyTimer);
    this.readyTimer = null;
    this.es?.close();
    this.es = null;
  }

  private fallBack() {
    this.closeSse();
    this.startPolling();
    // 잠깐 끊긴 것일 수 있으니 가끔 SSE 를 다시 시도한다
    if (!this.retryTimer) {
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        this.everReady = false;
        this.openSse();
      }, SSE_RETRY_MS);
    }
  }

  private startPolling() {
    this.setStatus("polling");
    if (this.pollTimer) return;
    void this.poll();
    this.pollTimer = setInterval(() => void this.poll(), POLL_MS);
  }

  private stopPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  private async poll() {
    if (document.visibilityState === "hidden") return;
    try {
      const { rev } = await apiGet<{ rev: number }>(`/api/trips/${this.tripId}/rev`);
      this.noteRev(rev);
      if (this.status !== "polling") this.setStatus("polling");
    } catch {
      this.setStatus("offline");
    }
  }

  /** 다른 탭에 있다가 돌아오면 바로 한 번 확인 */
  private onVisible = () => {
    if (document.visibilityState === "visible" && this.pollTimer) void this.poll();
  };
}

const channels = new Map<string, { ch: TripChannel; refs: number }>();

function acquire(tripId: string) {
  let entry = channels.get(tripId);
  if (!entry) {
    entry = { ch: new TripChannel(tripId), refs: 0 };
    channels.set(tripId, entry);
    entry.ch.start();
  }
  entry.refs++;
  return entry.ch;
}

function release(tripId: string) {
  const entry = channels.get(tripId);
  if (!entry) return;
  // StrictMode 의 언마운트·재마운트에서 연결을 끊었다 다시 열지 않도록 조금 기다린다
  setTimeout(() => {
    entry.refs--;
    if (entry.refs <= 0 && channels.get(tripId) === entry) {
      entry.ch.stop();
      channels.delete(tripId);
    }
  }, 0);
}

/**
 * 다른 사람이 이 여행의 tables 중 하나를 바꾸면 onChange 를 부른다.
 * onChange 는 최신 함수를 쓰므로 useCallback 으로 감쌀 필요 없다.
 */
export function useTripChanges(tripId: string, tables: readonly ChangeTable[], onChange: () => void) {
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });
  const key = tables.join(",");
  useEffect(() => {
    if (!tripId) return;
    const watch = new Set(key.split(","));
    const ch = acquire(tripId);
    const listener: Listener = (changed) => {
      if (changed.has("*") || [...changed].some((t) => watch.has(t))) cb.current();
    };
    ch.listeners.add(listener);
    return () => {
      ch.listeners.delete(listener);
      release(tripId);
    };
  }, [tripId, key]);
}

/** 연결 상태 (화면 표시용) */
export function useSyncStatus(tripId: string): SyncStatus {
  return useSyncExternalStore(
    (notify) => {
      const ch = acquire(tripId);
      ch.statusListeners.add(notify);
      return () => {
        ch.statusListeners.delete(notify);
        release(tripId);
      };
    },
    () => channels.get(tripId)?.ch.status ?? "connecting",
    () => "connecting"
  );
}
