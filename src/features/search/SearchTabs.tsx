"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BedDouble, Plane } from "lucide-react";
import FlightSearchPanel, { type FlightDefaultValues } from "./FlightSearchPanel";
import HotelSearchPanel, { type HotelDefaultValues } from "./HotelSearchPanel";

type Tab = "flight" | "hotel";

interface SearchTabsProps {
  flightDefaults?: FlightDefaultValues;
  hotelDefaults?: HotelDefaultValues;
}

const TABS: Array<{ key: Tab; label: string; icon: typeof Plane }> = [
  { key: "flight", label: "항공권", icon: Plane },
  { key: "hotel", label: "숙소", icon: BedDouble },
];

export default function SearchTabs({ flightDefaults, hotelDefaults }: SearchTabsProps) {
  const [tab, setTab] = useState<Tab>("flight");

  return (
    <div className="space-y-4">
      {/* 탭 스위처 */}
      <div className="card inline-flex gap-1 p-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                active ? "text-white" : "text-[var(--foreground)]/60 hover:text-[var(--color-primary)]"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="search-tab-bg"
                  className={`absolute inset-0 rounded-xl ${
                    key === "flight"
                      ? "bg-[var(--color-primary)]"
                      : "bg-[var(--color-accent)]"
                  }`}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon size={15} className="relative z-10" />
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </div>

      {tab === "flight" ? (
        <FlightSearchPanel key="flight" defaultValues={flightDefaults} />
      ) : (
        <HotelSearchPanel key="hotel" defaultValues={hotelDefaults} />
      )}
    </div>
  );
}
