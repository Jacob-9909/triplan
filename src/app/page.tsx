"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Compass, MapPin, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import type { Trip } from "@/lib/types";
import DestinationSelector from "@/features/destination/DestinationSelector";
import type { DestinationSelection } from "@/data/world";
import TripCreateForm from "@/features/destination/TripCreateForm";
import CountryBackdrop from "@/features/ui/CountryBackdrop";

export default function HomePage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const dbConfigured = true;
  const [loading, setLoading] = useState(dbConfigured);
  const [creating, setCreating] = useState(false);
  const [selection, setSelection] = useState<DestinationSelection | null>(null);

  useEffect(() => {
    if (!dbConfigured) return;
    apiGet<Trip[]>("/api/trips")
      .then((data) => {
        setTrips(data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [dbConfigured]);

  if (creating && selection === null) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-10 md:px-8 md:py-14">
        <h1 className="mb-6 text-center text-3xl font-extrabold tracking-tight md:text-4xl">
          어디로 떠나볼까요? ✈️
        </h1>
        <DestinationSelector
          onComplete={(sel) => setSelection(sel)}
        />
      </main>
    );
  }

  if (creating && selection !== null) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-10 md:max-w-2xl md:px-8 md:py-14">
        <TripCreateForm
          selection={selection}
          onSuccess={(trip) => {
            router.push(`/trips/${trip.id}`);
          }}
          onCancel={() => {
            setSelection(null);
            setCreating(false);
          }}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-20">
      {/* 히어로 */}
      <section className="fade-up relative mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-primary-soft via-surface to-accent-soft p-10 text-center shadow-sm md:mt-12 md:p-16 xl:p-20">
        <motion.div
          animate={{ y: [-4, 4, -4] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="absolute left-8 top-8 text-primary"
        >
          <Compass size={36} />
        </motion.div>
        <h1 className="text-4xl font-extrabold tracking-tight text-primary-strong md:text-5xl xl:text-6xl">
          Triplan
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-foreground/60 md:max-w-xl md:text-base xl:text-lg">
          여행지 선정부터 지도 핀, 이동경로, 가계부, 준비물까지 —
          <br />
          여행의 모든 계획을 한 곳에서.
        </p>
        <button
          onClick={() => setCreating(true)}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-white shadow-md transition hover:bg-primary-strong disabled:opacity-40 md:mt-8 md:px-8 md:py-4 md:text-base"
        >
          <Plus size={18} /> 새 여행 시작하기
        </button>
      </section>

      {/* 여행 목록 */}
      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold md:text-xl">
          <Sparkles size={18} className="text-sand" /> 내 여행
        </h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card h-40 animate-pulse bg-surface-muted" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="card p-10 text-center text-sm text-foreground/50">
            아직 여행이 없어요. 위에서 첫 여행을 만들어보세요!
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {trips.map((trip, i) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={`/trips/${trip.id}`}
                  className="card relative isolate block overflow-hidden p-5 transition hover:-translate-y-1 hover:border-primary md:p-6"
                >
                  <CountryBackdrop
                    country={trip.country}
                    continent={trip.continent ?? undefined}
                  />
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold">{trip.title}</h3>
                    <MapPin size={16} className="shrink-0 text-accent" />
                  </div>
                  <p className="mt-1 text-xs text-foreground/50">
                    {[trip.country, trip.region].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-3 text-xs text-foreground/40">
                    {trip.start_date} ~ {trip.end_date}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
