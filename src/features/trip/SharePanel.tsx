"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Eye, PencilLine, RefreshCw, Share, Trash2 } from "lucide-react";
import type { Trip } from "@/lib/types";
import { apiDelete, apiPost } from "@/lib/api";
import Sheet from "@/features/ui/Sheet";

type Kind = "edit" | "view";

const META: Record<Kind, { title: string; body: string; icon: typeof Eye; path: string; tone: string }> = {
  edit: {
    title: "함께 편집 링크",
    body: "동행자가 핀·일정·가계부·준비물을 같이 고칠 수 있어요. 여행 삭제나 링크 변경은 못 해요.",
    icon: PencilLine,
    path: "t",
    tone: "bg-primary-soft text-primary-strong",
  },
  view: {
    title: "보기 전용 링크",
    body: "가족·친구가 일정만 볼 수 있어요. 예약번호와 예약 링크는 보이지 않아요.",
    icon: Eye,
    path: "v",
    tone: "bg-mint/15 text-emerald-600",
  },
};

export default function SharePanel({ open, onClose, trip }: { open: boolean; onClose: () => void; trip: Trip }) {
  const router = useRouter();
  const [tokens, setTokens] = useState({ edit: trip.edit_token ?? "", view: trip.view_token ?? "" });
  const [copied, setCopied] = useState<Kind | null>(null);
  const [confirming, setConfirming] = useState<Kind | "delete" | null>(null);
  // 시트는 열릴 때만 렌더되므로(클라이언트 전용) window를 바로 써도 된다
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const link = (k: Kind) => `${origin}/${META[k].path}/${tokens[k]}`;

  async function copy(k: Kind) {
    await navigator.clipboard.writeText(link(k));
    setCopied(k);
    setTimeout(() => setCopied(null), 1600);
  }

  async function nativeShare(k: Kind) {
    if (navigator.share) {
      await navigator.share({ title: trip.title, text: `${trip.title} 여행 계획`, url: link(k) }).catch(() => null);
    } else {
      await copy(k);
    }
  }

  async function regenerate(k: Kind) {
    const res = await apiPost<{ edit_token: string; view_token: string }>(`/api/trips/${trip.id}/share`, { kind: k });
    setTokens({ edit: res.edit_token, view: res.view_token });
    setConfirming(null);
  }

  async function remove() {
    await apiDelete(`/api/trips/${trip.id}`);
    router.replace("/");
    router.refresh();
  }

  return (
    <Sheet open={open} onClose={onClose} title="여행 공유">
      <p className="text-sm text-foreground/55">링크를 가진 사람은 로그인 없이 들어올 수 있어요.</p>
      <div className="mt-4 space-y-3">
        {(Object.keys(META) as Kind[]).map((k) => {
          const { title, body, icon: Icon, tone } = META[k];
          return (
            <section key={k} className="rounded-2xl border border-border-subtle p-4">
              <div className="flex items-start gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold">{title}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-foreground/55">{body}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-muted p-1.5 pl-3">
                <code className="min-w-0 flex-1 truncate text-xs text-foreground/60">{link(k)}</code>
                <button
                  onClick={() => void copy(k)}
                  className="btn btn-primary shrink-0 px-3 py-1.5 text-xs"
                  aria-label={`${title} 복사`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={copied === k ? "done" : "copy"}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      className="flex items-center gap-1"
                    >
                      {copied === k ? <Check size={13} /> : <Copy size={13} />}
                      {copied === k ? "복사됨" : "복사"}
                    </motion.span>
                  </AnimatePresence>
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <button
                  onClick={() => void nativeShare(k)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary-strong"
                >
                  <Share size={13} /> 보내기
                </button>
                {confirming === k ? (
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-foreground/55">이전 링크는 바로 막혀요.</span>
                    <button onClick={() => void regenerate(k)} className="font-bold text-accent">
                      바꾸기
                    </button>
                    <button onClick={() => setConfirming(null)} className="text-foreground/45">
                      취소
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirming(k)}
                    className="inline-flex items-center gap-1 text-xs text-foreground/45 hover:text-foreground"
                  >
                    <RefreshCw size={12} /> 새 링크로 바꾸기
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-6 border-t border-border-subtle pt-4">
        {confirming === "delete" ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-accent-soft p-3 text-sm">
            <span className="text-[#c2410c]">지도·일정·가계부까지 모두 지워져요.</span>
            <span className="flex shrink-0 gap-2">
              <button onClick={() => setConfirming(null)} className="btn btn-ghost px-3 py-1.5 text-xs">
                취소
              </button>
              <button onClick={() => void remove()} className="btn bg-accent px-3 py-1.5 text-xs text-white">
                삭제
              </button>
            </span>
          </div>
        ) : (
          <button
            onClick={() => setConfirming("delete")}
            className="inline-flex items-center gap-1.5 text-sm text-foreground/45 transition hover:text-accent"
          >
            <Trash2 size={14} /> 이 여행 삭제
          </button>
        )}
      </div>
    </Sheet>
  );
}
