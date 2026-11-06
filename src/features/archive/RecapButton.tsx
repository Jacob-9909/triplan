"use client";

import { useState } from "react";
import { Download, ImageIcon, Loader2 } from "lucide-react";
import Sheet from "@/features/ui/Sheet";
import { tokenQuery } from "@/lib/api";
import { useT } from "@/i18n/I18nProvider";

/** 다녀온 여행의 회고 카드(PNG) 미리보기 + 저장. 공유 링크로 들어온 사람도 볼 수 있게 토큰을 쿼리로 붙인다 */
export default function RecapButton({ tripId }: { tripId: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  // 열 때마다 새로 그리게 주소에 붙이는 값 (그사이 고친 평점·한줄평 반영)
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const base = `/api/trips/${tripId}/recap${tokenQuery()}`;
  const join = base.includes("?") ? "&" : "?";

  return (
    <>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          setVersion(Date.now());
          setStatus("loading");
          setOpen(true);
        }}
      >
        <ImageIcon size={16} aria-hidden /> {t("회고 카드 만들기")}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("회고 카드")}>
        <div className="card relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden bg-surface-muted">
          {status !== "ready" && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 px-6 text-center text-sm text-foreground/68">
              {status === "loading" ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden /> {t("카드를 만드는 중…")}
                </>
              ) : (
                t("카드를 만들지 못했어요.")
              )}
            </div>
          )}
          {open && (
            // eslint-disable-next-line @next/next/no-img-element -- 서버가 그린 PNG (최적화 대상 아님)
            <img
              key={version}
              src={`${base}${join}v=${version}`}
              alt={t("회고 카드 미리보기")}
              onLoad={() => setStatus("ready")}
              onError={() => setStatus("error")}
              className={`h-full w-full object-contain transition-opacity duration-300 ${
                status === "ready" ? "opacity-100" : "opacity-0"
              }`}
            />
          )}
        </div>
        <div className="mx-auto mt-4 w-full max-w-sm">
          <a
            href={`${base}${join}download=1`}
            download="triplan-recap.png"
            aria-disabled={status !== "ready"}
            className={`btn btn-primary w-full ${status === "ready" ? "" : "pointer-events-none opacity-50"}`}
          >
            <Download size={16} aria-hidden /> {t("이미지 저장")}
          </a>
        </div>
      </Sheet>
    </>
  );
}
