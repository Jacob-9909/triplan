"use client";

import { useCallback, useState } from "react";
import { CalendarPlus, ChevronRight, Map as MapIcon, Printer } from "lucide-react";
import type { MapPoint, TravelDoc, Trip } from "@/lib/types";
import Sheet from "@/features/ui/Sheet";
import { WHOLE_TRIP } from "@/features/prep/dayDocs";
import { usePrefs } from "@/i18n/I18nProvider";
import { buildIcs, buildKml, fileName } from "./exportFiles";
import type { PlanDay } from "./itinerary";
import TripPrint from "./TripPrint";

/** 텍스트를 파일로 내려받는다 (iOS 사파리는 .ics 를 열면 캘린더 추가 화면이 뜬다) */
function save(name: string, type: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 내보내기: 캘린더(.ics) · 지도 앱(.kml) · 인쇄/PDF. 보기 링크로 들어온 사람도 쓸 수 있다 */
export default function ExportSheet({
  open,
  onClose,
  trip,
  days,
  bin,
  stays,
  docs,
}: {
  open: boolean;
  onClose: () => void;
  trip: Trip;
  days: PlanDay[];
  bin: MapPoint[];
  /** 숙소로 지정한 장소 (지도 파일에 따로 폴더) */
  stays: MapPoint[];
  docs: TravelDoc[];
}) {
  const { t } = usePrefs();
  const [printing, setPrinting] = useState(false);
  const donePrinting = useCallback(() => setPrinting(false), []);
  const hasPlaces = days.some((d) => d.stops.length > 0) || bin.length > 0 || stays.length > 0;

  const options = [
    {
      icon: CalendarPlus,
      title: "캘린더에 넣기",
      desc: "장소별 시간과 예약 날짜를 .ics 파일로 받아요. 구글·애플 캘린더에서 열면 일정이 들어가요.",
      // 날짜 없는 여행은 시각을 정할 날이 없다
      disabled: !trip.start_date ? "여행 날짜를 정하면 쓸 수 있어요" : null,
      run: () =>
        save(
          fileName(trip.title, "ics"),
          "text/calendar;charset=utf-8",
          buildIcs({ title: trip.title, days, docs, stamp: new Date() }, t, (d) => WHOLE_TRIP.includes(d.type))
        ),
    },
    {
      icon: MapIcon,
      title: "지도 앱으로",
      desc: "Day별 장소를 .kml 파일로 받아요. 구글 내 지도(My Maps)에서 가져오기로 열면 Day마다 레이어가 생겨요.",
      disabled: !hasPlaces ? "장소를 넣으면 쓸 수 있어요" : null,
      run: () => save(fileName(trip.title, "kml"), "application/vnd.google-earth.kml+xml", buildKml({ title: trip.title, days, bin, stays }, t)),
    },
    {
      icon: Printer,
      title: "인쇄 · PDF로 저장",
      desc: "Day별 타임테이블과 그날 예약을 일정표로 정리해요. 인쇄 창에서 PDF로 저장할 수 있어요.",
      disabled: null,
      run: () => setPrinting(true),
    },
  ];

  return (
    <>
      <Sheet open={open} onClose={onClose} title={t("내보내기")}>
        <ul className="space-y-2">
          {options.map(({ icon: Icon, title, desc, disabled, run }) => (
            <li key={title}>
              <button
                type="button"
                disabled={!!disabled}
                onClick={() => {
                  onClose();
                  run();
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-border-subtle bg-surface p-3.5 text-left transition hover:border-primary/50 hover:bg-primary-soft/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border-subtle disabled:hover:bg-surface"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
                  <Icon size={20} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{t(title)}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-foreground/68">{t(disabled ?? desc)}</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-foreground/45" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
      {printing && <TripPrint trip={trip} days={days} bin={bin} docs={docs} onDone={donePrinting} />}
    </>
  );
}
