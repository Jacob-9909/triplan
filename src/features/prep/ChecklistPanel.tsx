"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  IdCard,
  Luggage,
  Plus,
  Shirt,
  Plug,
  Pill,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useChecklist } from "./useChecklist";
import {
  CHECKLIST_CATEGORY_LABEL,
  CHECKLIST_TEMPLATES,
  type ChecklistCategory,
} from "./checklistTemplates";

const CATEGORY_ICON: Record<ChecklistCategory, typeof IdCard> = {
  docs: IdCard,
  electronics: Plug,
  clothes: Shirt,
  toiletries: Sparkles,
  etc: Pill,
};

function CircularProgress({ value, total }: { value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 72 72" className="h-20 w-20 -rotate-90">
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="var(--color-primary-soft)"
          strokeWidth="7"
        />
        <motion.circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-foreground">{pct}%</span>
        <span className="text-[10px] text-slate-400">
          {value}/{total}
        </span>
      </div>
    </div>
  );
}

export default function ChecklistPanel({ tripId }: { tripId: string }) {
  const { items, loading, addItem, addItems, toggleItem, removeItem } =
    useChecklist(tripId);
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState<ChecklistCategory>("etc");
  const [showTemplates, setShowTemplates] = useState(false);

  const doneCount = items.filter((i) => i.is_checked).length;
  const existingLabels = useMemo(() => new Set(items.map((i) => i.label)), [
    items,
  ]);
  const missingTemplateCount = CHECKLIST_TEMPLATES.filter(
    (t) => !existingLabels.has(t.label),
  ).length;

  /** 템플릿 카테고리별 그룹 */
  const groupedTemplates = useMemo(() => {
    const map = new Map<ChecklistCategory, typeof CHECKLIST_TEMPLATES>();
    for (const t of CHECKLIST_TEMPLATES) {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category)!.push(t);
    }
    return map;
  }, []);

  /** 실제 보유 항목을 카테고리별로 그룹핑 */
  const CATEGORY_ORDER: ChecklistCategory[] = [
    "docs",
    "electronics",
    "clothes",
    "toiletries",
    "etc",
  ];
  const groupedItems = useMemo(() => {
    const map = new Map<ChecklistCategory, typeof items>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const it of items) {
      const cat = (
        CATEGORY_ORDER.includes(it.category as ChecklistCategory)
          ? it.category
          : "etc"
      ) as ChecklistCategory;
      map.get(cat)!.push(it);
    }
    return [...map.entries()].filter(([, list]) => list.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    await addItem(newLabel, newCategory);
    setNewLabel("");
  };

  return (
    <section className="card fade-up p-6 lg:p-7">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]">
          <Luggage size={22} />
        </div>
        <div>
          <h2 className="text-lg font-bold">출국 전 준비물 체크리스트</h2>
          <p className="text-sm text-slate-500">
            {doneCount}/{items.length} 완료 · 챙기고 떠나요!
          </p>
        </div>
        <div className="ml-auto">
          <CircularProgress value={doneCount} total={items.length} />
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(CHECKLIST_CATEGORY_LABEL) as ChecklistCategory[]).map(
            (cat) => {
              const Icon = CATEGORY_ICON[cat];
              const isActive = newCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setNewCategory(cat)}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition ${
                    isActive
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]"
                      : "border-[var(--border-subtle)] bg-white text-slate-500 hover:border-[var(--color-primary)]/50"
                  }`}
                >
                  <Icon size={13} />
                  {CHECKLIST_CATEGORY_LABEL[cat]}
                </button>
              );
            },
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleAdd()}
            placeholder={`준비물 추가 (${CHECKLIST_CATEGORY_LABEL[newCategory]})`}
            className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)]"
          />
          <button
            onClick={() => void handleAdd()}
            className="flex items-center gap-1 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-strong)]"
          >
            <Plus size={16} /> 추가
          </button>
        </div>
      </div>

      <button
        onClick={() => setShowTemplates((v) => !v)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-mint)]/15 px-3.5 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-[var(--color-mint)]/25"
      >
        <Sparkles size={14} />
        {showTemplates
          ? "템플릿 닫기"
          : `템플릿 한 번에 추가 (${missingTemplateCount}개)`}
      </button>

      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
              {[...groupedTemplates.entries()].map(([category, templates]) => {
                const Icon = CATEGORY_ICON[category];
                const missing = templates.filter(
                  (t) => !existingLabels.has(t.label),
                );
                return (
                  <div key={category}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                        <Icon size={14} className="text-[var(--color-violet)]" />
                        {CHECKLIST_CATEGORY_LABEL[category]}
                      </div>
                      {missing.length > 0 && (
                        <button
                          onClick={() =>
                            void addItems(
                              missing.map((t) => t.label),
                              missing.map(() => category),
                            )
                          }
                          className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-primary-strong)] transition hover:bg-[var(--color-primary)]/20"
                        >
                          + 이 항목만 추가 ({missing.length})
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {templates.map((t) => {
                        const exists = existingLabels.has(t.label);
                        return (
                          <button
                            key={t.label}
                            disabled={exists}
                            onClick={() => void addItems([t.label], [category])}
                            className={`rounded-full px-3 py-1 text-xs transition ${
                              exists
                                ? "cursor-default bg-slate-200/60 text-slate-400 line-through"
                                : "bg-white text-slate-700 shadow-sm ring-1 ring-[var(--border-subtle)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary-strong)]"
                            }`}
                          >
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {missingTemplateCount > 0 && (
                <button
                  onClick={() => {
                    const missing = CHECKLIST_TEMPLATES.filter(
                      (t) => !existingLabels.has(t.label),
                    );
                    void addItems(
                      missing.map((t) => t.label),
                      missing.map((t) => t.category),
                    );
                  }}
                  className="w-full rounded-xl bg-[var(--color-violet)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  없는 항목 {missingTemplateCount}개 한 번에 추가하기
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <p className="mt-6 text-center text-sm text-slate-400">
          불러오는 중…
        </p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-400">
          아직 준비물이 없어요. 템플릿으로 시작해보세요!
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          {groupedItems.map(([category, list]) => {
            const Icon = CATEGORY_ICON[category];
            const done = list.filter((i) => i.is_checked).length;
            return (
              <section key={category}>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-violet)]/15 text-[var(--color-violet)]">
                    <Icon size={13} />
                  </span>
                  {CHECKLIST_CATEGORY_LABEL[category]}
                  <span className="ml-auto font-normal text-slate-400">
                    {done}/{list.length}
                  </span>
                </div>
                <ul className="space-y-2">
                  <AnimatePresence initial={false}>
                    {list.map((item) => (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                  item.is_checked
                    ? "bg-[var(--color-primary-soft)]/60"
                    : "bg-white ring-1 ring-[var(--border-subtle)] hover:ring-[var(--color-primary)]/40"
                }`}
              >
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => void toggleItem(item.id)}
                  aria-label={`${item.label} 체크`}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    item.is_checked
                      ? "border-[var(--color-mint)] bg-[var(--color-mint)] text-white"
                      : "border-slate-300 bg-white text-transparent hover:border-[var(--color-primary)]"
                  }`}
                >
                  <motion.span
                    initial={false}
                    animate={
                      item.is_checked
                        ? { scale: [0, 1.3, 1], rotate: [-30, 0] }
                        : { scale: 0 }
                    }
                    transition={{ duration: 0.3 }}
                  >
                    <Check size={14} strokeWidth={3} />
                  </motion.span>
                </motion.button>

                <span
                  className="relative flex-1 cursor-pointer select-none text-sm"
                  onClick={() => void toggleItem(item.id)}
                >
                  <span className={item.is_checked ? "text-slate-400" : ""}>
                    {item.label}
                  </span>
                  <motion.span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-[1.5px] bg-slate-400"
                    initial={false}
                    animate={{
                      width: item.is_checked ? "100%" : "0%",
                      opacity: item.is_checked ? 1 : 0,
                    }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  />
                </span>

                <button
                  onClick={() => void removeItem(item.id)}
                  aria-label={`${item.label} 삭제`}
                  className="opacity-0 transition group-hover:opacity-100 text-slate-300 hover:text-[var(--color-accent)]"
                >
                  <Trash2 size={16} />
                </button>
              </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
