"use client";

import { apiDelete, apiDeleteKeepalive } from "./api";

/**
 * 되돌리기가 되는 삭제: 화면에서는 바로 빼고, 서버 삭제는 잠깐 기다렸다가 보낸다.
 * 기다리는 사이 되돌리기를 누르면 아무것도 지우지 않는다.
 * 탭을 닫거나 다른 페이지로 가도 기다리던 삭제는 keepalive 로 마저 보낸다.
 */
const pending = new Map<string, { timer: ReturnType<typeof setTimeout>; commit: () => void }>();

let listening = false;
function flushOnLeave() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("pagehide", () => {
    for (const [url, p] of pending) {
      clearTimeout(p.timer);
      apiDeleteKeepalive(url);
    }
    pending.clear();
  });
}

export const UNDO_MS = 6000;

/** url 을 UNDO_MS 뒤에 DELETE. 반환한 함수를 부르면 취소(되돌리기) */
export function scheduleDelete(url: string, { onCommitted, onFailed }: { onCommitted?: () => void; onFailed?: () => void } = {}) {
  flushOnLeave();
  const commit = () => {
    pending.delete(url);
    apiDelete(url).then(
      () => onCommitted?.(),
      () => onFailed?.()
    );
  };
  const timer = setTimeout(commit, UNDO_MS);
  pending.set(url, { timer, commit });
  return () => {
    const p = pending.get(url);
    if (!p) return false;
    clearTimeout(p.timer);
    pending.delete(url);
    return true;
  };
}

/** 지금 삭제를 기다리는 중인지 (다시 불러온 목록에서 빼는 데 쓴다) */
export function isDeletePending(url: string) {
  return pending.has(url);
}
