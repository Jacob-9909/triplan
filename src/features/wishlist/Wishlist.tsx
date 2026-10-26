"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Heart, MapPin, MoreHorizontal, PencilLine, Plane, Plus, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { MapPoint, WishlistPlace } from "@/lib/types";
import type { DestinationSelection } from "@/data/world";
import { TripMap } from "@/features/map";
import DestinationSelector from "@/features/destination/DestinationSelector";
import CoverPhoto from "@/features/ui/CoverPhoto";
import Sheet from "@/features/ui/Sheet";
import Hearts from "./Hearts";
import WishForm, { type WishDraft } from "./WishForm";
import { PRIORITIES, priorityLabel } from "./priority";

type Filter = "all" | 1 | 2 | 3;

/** 위시리스트 항목을 지도 핀 모양으로 변환 */
function toPoint(w: WishlistPlace): MapPoint {
  return {
    id: w.id,
    trip_id: "",
    name: w.name,
    category: w.priority === 3 ? "food" : w.priority === 2 ? "attraction" : "nature",
    memo: [priorityLabel(w.priority), w.memo].filter(Boolean).join(" · "),
    lat: w.lat ?? 0,
    lng: w.lng ?? 0,
    day_number: null,
    visit_order: null,
    created_at: w.created_at,
  };
}

export default function Wishlist() {
  const [items, setItems] = useState<WishlistPlace[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<DestinationSelection | null>(null);
  const [editing, setEditing] = useState<WishlistPlace | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<WishlistPlace[]>("/api/wishlist").then(setItems).catch(() => setItems([]));
  }, []);

  const shown = useMemo(
    () => (items ?? []).filter((w) => filter === "all" || w.priority === filter),
    [items, filter]
  );
  const countries = useMemo(() => new Set((items ?? []).map((w) => w.country).filter(Boolean)).size, [items]);

  function closeAdd() {
    setAdding(false);
    setPicked(null);
  }

  async function create(draft: WishDraft) {
    if (!picked) return;
    const saved = await apiPost<WishlistPlace>("/api/wishlist", {
      ...draft,
      continent: picked.continent.name,
      country: picked.country.name,
      region: picked.city.name,
      lat: picked.city.lat,
      lng: picked.city.lng,
    });
    setItems((prev) => [saved, ...(prev ?? [])]);
    closeAdd();
  }

  async function update(draft: WishDraft) {
    if (!editing) return;
    await apiPatch(`/api/wishlist/${editing.id}`, draft);
    setItems((prev) => (prev ?? []).map((w) => (w.id === editing.id ? { ...w, ...draft } : w)));
    setEditing(null);
  }

  async function remove(id: string) {
    await apiDelete(`/api/wishlist/${id}`);
    setItems((prev) => (prev ?? []).filter((w) => w.id !== id));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6">
      <div className="mt-3 flex items-end justify-between gap-4 md:mt-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">가고 싶은 곳</h1>
          <p className="mt-1 text-sm text-foreground/65">
            {items === null ? "불러오는 중…" : `${countries}개 나라 · ${items.length}곳을 담아 뒀어요`}
          </p>
        </div>
        <button onClick={() => setAdding(true)} className="btn btn-primary shrink-0 px-4 py-2.5 text-sm">
          <Plus size={16} /> 담기
        </button>
      </div>

      {/* 세계지도 */}
      <div className="mt-5 overflow-hidden rounded-[var(--radius-card)] shadow-card">
        <TripMap
          points={(items ?? []).filter((w) => w.lat !== null && w.lng !== null).map(toPoint)}
          showRoute={false}
          numbered={false}
          heightClass="h-56 md:h-80"
          selectedPointId={focusId}
          onPointClick={(id) => {
            setFocusId(id);
            document.getElementById(`wish-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />
      </div>

      {/* 우선순위 필터 */}
      <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {(["all", 3, 2, 1] as Filter[]).map((f) => {
          const active = filter === f;
          return (
            <button
              key={String(f)}
              onClick={() => setFilter(f)}
              className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                active ? "text-white" : "bg-surface text-foreground/72 shadow-sm ring-1 ring-border-subtle"
              }`}
            >
              {active && (
                <motion.span layoutId="wish-filter" className="absolute inset-0 rounded-full bg-foreground" transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />
              )}
              <span className="relative flex items-center gap-1.5">
                {f === "all" ? "전체" : <><Hearts value={f} size={12} light={active} /> {priorityLabel(f)}</>}
              </span>
            </button>
          );
        })}
      </div>

      {/* 카드 */}
      {items === null ? (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton aspect-[4/5] rounded-[var(--radius-card)]" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <EmptyWish onAdd={() => setAdding(true)} filtered={filter !== "all"} />
      ) : (
        <motion.div layout className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
          <AnimatePresence>
            {shown.map((w, i) => (
              <WishCard
                key={w.id}
                wish={w}
                index={i}
                focused={focusId === w.id}
                onEdit={() => setEditing(w)}
                onDelete={() => void remove(w.id)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* 새로 담기: 목적지 고르기 → 메모 */}
      <Sheet open={adding} onClose={closeAdd} title={picked ? `${picked.country.flag} ${picked.city.name}` : "어디에 가고 싶나요?"} wide={!picked}>
        {picked ? (
          <WishForm selection={picked} onSubmit={create} submitLabel="가고 싶은 곳에 담기" />
        ) : (
          <DestinationSelector onComplete={setPicked} />
        )}
      </Sheet>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title="가고 싶은 곳 수정">
        {editing && <WishForm initial={editing} onSubmit={update} submitLabel="저장" />}
      </Sheet>
    </div>
  );
}

function WishCard({
  wish,
  index,
  focused,
  onEdit,
  onDelete,
}: {
  wish: WishlistPlace;
  index: number;
  focused: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <motion.article
      id={`wish-${wish.id}`}
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      className={`group relative flex aspect-[4/5] flex-col overflow-hidden rounded-[var(--radius-card)] bg-slate-200 text-white shadow-card transition-shadow ${
        focused ? "ring-4 ring-primary" : ""
      }`}
    >
      <CoverPhoto country={wish.country} continent={wish.continent} zoomOnHover />

      <div className="relative flex items-start justify-between p-3">
        <span className="rounded-full bg-black/25 px-2 py-1 backdrop-blur-md">
          <Hearts value={wish.priority} size={12} light />
        </span>
        <div className="relative">
          <button
            onClick={() => setMenu((v) => !v)}
            aria-label="더보기"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/25 backdrop-blur-md"
          >
            <MoreHorizontal size={16} />
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute right-0 top-10 z-10 w-32 overflow-hidden rounded-xl bg-surface text-sm text-foreground shadow-lift"
                onMouseLeave={() => setMenu(false)}
              >
                <button onClick={() => { setMenu(false); onEdit(); }} className="flex w-full items-center gap-2 px-3 py-2.5 hover:bg-surface-muted">
                  <PencilLine size={14} /> 수정
                </button>
                <button onClick={() => { setMenu(false); onDelete(); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-accent hover:bg-accent-soft">
                  <Trash2 size={14} /> 삭제
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="relative mt-auto p-3.5">
        <p className="text-xs font-semibold text-white/88">
          <MapPin size={12} className="inline -mt-0.5" /> {[wish.country, wish.region].filter(Boolean).join(" · ")}
        </p>
        <h3 className="mt-0.5 line-clamp-2 text-lg font-bold leading-snug tracking-tight">{wish.name}</h3>
        {wish.memo && <p className="mt-1 line-clamp-2 text-xs text-white/85">{wish.memo}</p>}
        {wish.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {wish.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm">
                #{t}
              </span>
            ))}
          </div>
        )}
        {wish.trip_id ? (
          <Link
            href={`/trips/${wish.trip_id}`}
            className="mt-3 flex items-center justify-center gap-1 rounded-full bg-mint py-2 text-xs font-bold text-white"
          >
            계획 중인 여행 보기 <ArrowRight size={13} />
          </Link>
        ) : (
          <Link
            href={`/trips/new?wish=${wish.id}`}
            className="mt-3 flex items-center justify-center gap-1 rounded-full bg-white py-2 text-xs font-bold text-foreground transition active:scale-95"
          >
            <Plane size={13} /> 여행으로 만들기
          </Link>
        )}
      </div>
    </motion.article>
  );
}

function EmptyWish({ onAdd, filtered }: { onAdd: () => void; filtered: boolean }) {
  return (
    <div className="card mt-5 flex flex-col items-center px-6 py-14 text-center">
      <motion.span
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"
      >
        <Heart size={26} fill="currentColor" />
      </motion.span>
      <h2 className="mt-4 text-lg font-bold">{filtered ? "이 우선순위에는 아직 없어요" : "가고 싶은 곳을 담아 보세요"}</h2>
      <p className="mt-1.5 max-w-xs text-sm text-foreground/65">
        언젠가 가 보고 싶은 나라와 도시를 모아 두면, 마음이 정해졌을 때 바로 여행으로 바꿀 수 있어요.
      </p>
      {!filtered && (
        <button onClick={onAdd} className="btn btn-primary mt-5 px-5 py-2.5 text-sm">
          <Plus size={16} /> 첫 번째 담기
        </button>
      )}
    </div>
  );
}

export { PRIORITIES };
