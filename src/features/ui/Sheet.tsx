"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

/**
 * 모바일에선 아래에서 올라오는 바텀시트, 데스크톱에선 가운데 다이얼로그.
 */
export default function Sheet({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
          <motion.div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-surface shadow-lift md:rounded-[1.75rem] ${
              wide ? "md:max-w-4xl" : "md:max-w-lg"
            }`}
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-200 md:hidden" />
            <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-3 md:px-6 md:pt-5">
              <h2 className="text-lg font-bold tracking-tight">{title}</h2>
              <button
                onClick={onClose}
                aria-label="닫기"
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/50 transition hover:bg-surface-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-6 md:pb-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
