"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import type { DestinationSelection } from "@/data/world";
import type { WishlistPlace } from "@/lib/types";
import Hearts from "./Hearts";
import { useT } from "@/i18n/I18nProvider";
import { priorityLabel } from "./priority";

export interface WishDraft {
  name: string;
  memo: string | null;
  tags: string[];
  priority: number;
}

/** 이름·우선순위·메모·태그 입력 (새로 담기와 수정에 같이 사용) */
export default function WishForm({
  selection,
  initial,
  onSubmit,
  submitLabel,
}: {
  selection?: DestinationSelection;
  initial?: WishlistPlace;
  onSubmit: (draft: WishDraft) => Promise<void>;
  submitLabel: string;
}) {
  const tr = useT();
  const [name, setName] = useState(initial?.name ?? (selection ? tr(selection.city.name) : ""));
  const [priority, setPriority] = useState(initial?.priority ?? 2);
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  function addTag() {
    const t = tagInput.trim().replace(/^#/, "");
    if (t && !tags.includes(t) && tags.length < 10) setTags([...tags, t]);
    setTagInput("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    await onSubmit({ name: name.trim(), memo: memo.trim() || null, tags, priority });
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-semibold">{tr("이름")}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input mt-1.5" placeholder={tr("예: 교토 단풍 여행")} />
      </label>

      <div>
        <span className="text-sm font-semibold">{tr("얼마나 가고 싶나요?")}</span>
        <div className="mt-1.5 flex items-center gap-3">
          <Hearts value={priority} onChange={setPriority} size={24} />
          <span className="text-sm font-medium text-foreground/65">{tr(priorityLabel(priority))}</span>
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-semibold">{tr("메모")}</span>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
          className="input mt-1.5 resize-none"
          placeholder={tr("가고 싶은 이유, 보고 싶은 것, 좋은 계절…")}
        />
      </label>

      <div>
        <span className="text-sm font-semibold">{tr("태그")}</span>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-[0.875rem] border border-border-subtle bg-surface-muted p-2">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold shadow-sm">
              #{t}
              <button type="button" aria-label={tr("{tag} 태그 삭제", { tag: t })} onClick={() => setTags(tags.filter((x) => x !== t))}>
                <X size={12} className="text-foreground/68" />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
            placeholder={tags.length ? "" : tr("바다, 미식, 겨울… (Enter)")}
            className="min-w-24 flex-1 bg-transparent px-1 py-1 text-sm outline-none"
          />
        </div>
      </div>

      <button type="submit" disabled={!name.trim() || saving} className="btn btn-primary w-full py-3.5 disabled:opacity-50">
        {saving ? <Loader2 size={18} className="animate-spin" /> : submitLabel}
      </button>
    </form>
  );
}
