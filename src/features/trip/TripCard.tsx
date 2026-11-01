"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarDays, MapPin } from "lucide-react";
import type { Trip } from "@/lib/types";
import CoverPhoto from "@/features/ui/CoverPhoto";
import { ddayLabel, formatRange, stayLabel, tripPhase } from "@/features/ui/dates";
import { usePrefs } from "@/i18n/I18nProvider";

/** 사진 위에 정보가 올라가는 여행 카드 */
export default function TripCard({ trip, index = 0, href = `/trips/${trip.id}` }: { trip: Trip; index?: number; href?: string }) {
  const { t, locale } = usePrefs();
  const { phase } = tripPhase(trip);
  const stay = stayLabel(trip, locale);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <Link
        href={href}
        className="card-lift group relative block aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-slate-200 shadow-card sm:aspect-[4/4.6]"
      >
        <CoverPhoto country={trip.country} continent={trip.continent} city={trip.region} title={trip.title} zoomOnHover />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-md ${
              phase === "ongoing"
                ? "bg-mint text-white"
                : phase === "upcoming"
                  ? "bg-surface/90 text-foreground"
                  : "bg-black/35 text-white"
            }`}
          >
            {ddayLabel(trip, locale)}
          </span>
          {trip.access === "edit" && trip.owner_username && (
            <span className="rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
              {t("{name}님이 초대", { name: trip.owner_username })}
            </span>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="text-xs font-semibold text-white/88">
            <MapPin size={12} className="inline -mt-0.5" /> {[trip.country, trip.region].filter(Boolean).map((s) => t(s!)).join(" · ")}
          </p>
          <h3 className="mt-1 line-clamp-2 text-lg font-bold leading-snug tracking-tight">{trip.title}</h3>
          <p className="mt-1.5 flex items-center gap-1 text-xs text-white/85">
            <CalendarDays size={12} className="shrink-0" />
            <span className="truncate">{formatRange(trip, locale)}</span>
          </p>
          {stay && <p className="mt-0.5 pl-4 text-[11px] text-white/75">{stay}</p>}
        </div>
      </Link>
    </motion.div>
  );
}
