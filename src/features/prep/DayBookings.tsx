"use client";

import { ExternalLink } from "lucide-react";
import type { TravelDoc } from "@/lib/types";
import { useT } from "@/i18n/I18nProvider";
import { DOC_META, safeUrl } from "./DocsPanel";
import { docsOnDay, type DayDoc } from "./dayDocs";

const HOTEL_WHEN = { start: "체크인", during: "숙박", end: "체크아웃" } as const;
const OTHER_WHEN = { start: null, during: "이용 중", end: "마지막 날" } as const;

/** 그날 걸린 항공권·숙소·티켓을 일정 위에 한 줄로. 예약번호를 바로 보여 준다 */
export default function DayBookings({ docs, date }: { docs: TravelDoc[]; date: string }) {
  const t = useT();
  const items = docsOnDay(docs, date);
  if (items.length === 0) return null;

  return (
    <ul aria-label={t("이날 예약")} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map(({ doc, when }: DayDoc) => {
        const meta = DOC_META[doc.type];
        const Icon = meta.icon;
        const url = safeUrl(doc.url);
        const label = (doc.type === "hotel" ? HOTEL_WHEN : OTHER_WHEN)[when] ?? meta.label;
        const body = (
          <>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.bg} ${meta.text}`}>
              <Icon size={17} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className={`block text-[11px] font-bold ${meta.text}`}>{t(label)}</span>
              <span className="block max-w-48 truncate text-sm font-semibold">{doc.title}</span>
              {doc.confirmation_code && (
                <span className="block font-mono text-[11px] text-foreground/68">{doc.confirmation_code}</span>
              )}
            </span>
            {url && <ExternalLink size={13} className="shrink-0 text-foreground/45" aria-hidden />}
          </>
        );
        const cls = "card flex shrink-0 items-center gap-2.5 px-3 py-2.5";
        return (
          <li key={doc.id}>
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer" className={`${cls} transition hover:shadow-lift`}>
                {body}
              </a>
            ) : (
              <div className={cls}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
