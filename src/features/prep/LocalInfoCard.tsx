"use client";

import { useEffect, useState } from "react";
import { Clock, HandCoins, Phone, Plug } from "lucide-react";
import { countryInfo, koreanPlugFits, utcOffsetMin } from "@/data/countryInfo";

function gapLabel(min: number) {
  if (min === 0) return "한국과 같은 시간";
  const h = Math.abs(min) / 60;
  return `한국보다 ${Number.isInteger(h) ? h : h.toFixed(1)}시간 ${min > 0 ? "빨라요" : "느려요"}`;
}

/** 시차·현지 시각, 콘센트·전압, 긴급 전화, 팁 */
export default function LocalInfoCard({ country, region }: { country: string | null; region: string | null }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const info = countryInfo(country, region);
  if (!info || country === "대한민국") return null;

  const gap = utcOffsetMin(info.tz, now) - utcOffsetMin("Asia/Seoul", now);
  const localTime = new Intl.DateTimeFormat("ko-KR", { timeZone: info.tz, hour: "numeric", minute: "2-digit", weekday: "short" }).format(now);
  const plugOk = koreanPlugFits(info.plugs);
  const lowVolt = parseInt(info.volt) < 200;

  const rows = [
    { icon: Clock, label: "시차", value: gapLabel(gap), sub: `지금 현지 ${localTime}` },
    {
      icon: Plug,
      label: "콘센트",
      value: `${info.plugs} 타입 · ${info.volt}`,
      sub: [plugOk ? "한국 플러그 대부분 그대로" : "변환 어댑터 챙기기", lowVolt && "프리볼트(100~240V) 제품만"].filter(Boolean).join(" · "),
      warn: !plugOk || lowVolt,
    },
    { icon: Phone, label: "긴급 전화", value: info.sos },
    { icon: HandCoins, label: "팁", value: info.tip },
  ];

  return (
    <section className="card p-5 lg:col-span-2">
      <h3 className="text-sm font-bold">{region || country} 현지 정보</h3>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map(({ icon: Icon, label, value, sub, warn }) => (
          <div key={label} className="rounded-2xl bg-surface-muted p-3.5">
            <dt className="flex items-center gap-1.5 text-xs font-semibold text-foreground/68">
              <Icon size={14} /> {label}
            </dt>
            <dd className="mt-1 text-sm font-bold">{value}</dd>
            {sub && <dd className={`mt-0.5 text-xs ${warn ? "font-semibold text-accent" : "text-foreground/68"}`}>{sub}</dd>}
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-foreground/68">긴급 번호·입국 조건은 출발 전 외교부 해외안전여행(0404.go.kr)에서 한 번 더 확인하세요.</p>
    </section>
  );
}
