"use client";

import { useSyncExternalStore } from "react";
import { CalendarPlus, CalendarSync, Download } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";

const noop = () => () => {};

/**
 * 여행 일정을 캘린더로: 구독(webcal), Google 캘린더에 추가, .ics 내려받기.
 * 보기 링크 토큰을 쓰므로 예약번호·예약 링크는 캘린더에 들어가지 않는다.
 */
export default function CalendarLinks({ viewToken }: { viewToken: string }) {
  const t = useT();
  // 서버 렌더에선 주소를 모르니 비워 두고, 브라우저에서 채운다 (hydration 불일치 방지)
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const path = `/v/${encodeURIComponent(viewToken)}/calendar.ics`;
  const ready = origin !== "";
  const webcal = `${origin.replace(/^https?:/, "webcal:")}${path}`;
  const google = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`;

  const link = "btn btn-ghost w-full justify-start px-4 py-2 text-sm aria-disabled:pointer-events-none aria-disabled:opacity-50";
  return (
    <section className="card p-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <a href={ready ? webcal : undefined} aria-disabled={!ready} className={link}>
          <CalendarSync size={16} className="shrink-0 text-primary-strong" /> {t("캘린더 구독")}
        </a>
        <a href={ready ? google : undefined} aria-disabled={!ready} target="_blank" rel="noopener noreferrer" className={link}>
          <CalendarPlus size={16} className="shrink-0 text-primary-strong" /> {t("Google 캘린더에 추가")}
        </a>
        <a href={ready ? `${origin}${path}` : undefined} aria-disabled={!ready} download="triplan.ics" className={link}>
          <Download size={16} className="shrink-0 text-primary-strong" /> {t(".ics 내려받기")}
        </a>
      </div>
      <p className="mt-2.5 text-xs leading-relaxed text-foreground/65">
        {t("구독해 두면 일정이 바뀔 때 휴대폰 캘린더에도 알아서 반영돼요.")}
      </p>
    </section>
  );
}
