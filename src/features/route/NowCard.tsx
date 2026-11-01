"use client";

import { useEffect, useMemo, useState } from "react";
import { Navigation, Sparkles } from "lucide-react";
import type { MapPoint, RouteLeg } from "@/lib/types";
import { PointBadge } from "@/features/map/pointStyle";
import { buildSchedule, formatDuration, formatTime } from "./schedule";
import { directionsUrl } from "./directions";
import { usePrefs } from "@/i18n/I18nProvider";

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** 여행 중 오늘 Day 위에 뜨는 카드: 지금 있을 곳 또는 다음 장소 + 길찾기 */
export default function NowCard({ points, legs }: { points: MapPoint[]; legs: RouteLeg[] }) {
  const { t, locale } = usePrefs();
  // ponytail: 기기 시계 기준. 여행지에 있으면 폰 시각이 현지 시각이다
  const [now, setNow] = useState(nowMinutes);
  useEffect(() => {
    const id = setInterval(() => setNow(nowMinutes()), 30_000);
    return () => clearInterval(id);
  }, []);

  const schedule = useMemo(() => buildSchedule(points, legs), [points, legs]);
  if (points.length === 0) return null;

  const current = points.find((p) => {
    const st = schedule.get(p.id)!;
    return st.arrive <= now && now < st.leave;
  });
  const next = points.find((p) => schedule.get(p.id)!.arrive > now);

  if (!current && !next) {
    return (
      <div className="card flex items-center gap-3 p-4 text-sm">
        <Sparkles size={18} className="shrink-0 text-mint" />
        <span>{t("오늘 일정을 다 돌았어요. 기록 탭에 오늘 하루를 남겨 보세요.")}</span>
      </div>
    );
  }

  const target = current ?? next!;
  const st = schedule.get(target.id)!;
  return (
    <div className="card flex items-center gap-3 p-4">
      <PointBadge point={target} size={36} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-mint">{current ? t("지금") : t("다음")}</p>
        <p className="truncate font-bold">{target.name}</p>
        <p className="text-xs tabular-nums text-foreground/68">
          {current
            ? t("{time}까지 · {left} 남음", { time: formatTime(st.leave), left: formatDuration(st.leave - now, locale) })
            : t("{time} 도착 예정 · {left} 후", { time: formatTime(st.arrive), left: formatDuration(st.arrive - now, locale) })}
        </p>
      </div>
      <a
        href={directionsUrl(target)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary shrink-0 px-4 text-sm"
      >
        <Navigation size={15} /> {t("길찾기")}
      </a>
    </div>
  );
}
