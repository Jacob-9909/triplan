"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useSyncExternalStore } from "react";

/**
 * 화면 아래 잠깐 뜨는 알림 (되돌리기 버튼을 붙일 수 있다).
 * 어디서든 toast() 로 띄우고, 화면에는 Providers 의 <Toaster /> 하나가 그린다.
 * 문구는 부르는 쪽에서 t() 로 번역해 넘긴다
 */
export interface ToastItem {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
  tone?: "default" | "error";
}

let items: ToastItem[] = [];
const listeners = new Set<() => void>();
let seq = 0;

function emit() {
  listeners.forEach((fn) => fn());
}

export function toast({ duration = 5000, ...item }: Omit<ToastItem, "id"> & { duration?: number }) {
  const id = ++seq;
  // 많이 쌓이면 오래된 것부터 뺀다
  items = [...items.slice(-2), { ...item, id }];
  emit();
  setTimeout(() => dismissToast(id), duration);
  return id;
}

export function dismissToast(id: number) {
  if (!items.some((i) => i.id === id)) return;
  items = items.filter((i) => i.id !== id);
  emit();
}

const EMPTY: ToastItem[] = [];

export function Toaster() {
  const list = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => items,
    () => EMPTY
  );
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom)+0.75rem)] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 print:hidden"
    >
      <AnimatePresence initial={false}>
        {list.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
            className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-full py-2 pl-4 pr-2 text-sm font-semibold shadow-lift ${
              item.tone === "error" ? "bg-accent text-white" : "bg-slate-900 text-white"
            }`}
          >
            <span className="min-w-0 truncate">{item.message}</span>
            {item.action && (
              <button
                type="button"
                onClick={() => {
                  item.action!.onClick();
                  dismissToast(item.id);
                }}
                className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/25"
              >
                {item.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
