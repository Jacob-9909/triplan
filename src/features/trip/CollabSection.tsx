"use client";

import { useState } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Send, ThumbsUp, X } from "lucide-react";
import { usePrefs } from "@/i18n/I18nProvider";
import type { Collab } from "./useCollab";

/**
 * 장소 상세의 "동행 의견": 가고 싶어요(이름마다 하나)와 댓글.
 * 처음 쓸 때 이름을 고른다 (동행자 목록에서 고르거나 직접). 보기 링크는 읽기만 한다.
 */
export default function CollabSection({
  pointId,
  canEdit,
  collab,
  travelers,
}: {
  pointId: string;
  canEdit: boolean;
  collab: Collab;
  /** 정산에 넣은 동행자 이름 (이름 고르기 칩) */
  travelers: string[];
}) {
  const { t, df } = usePrefs();
  const { voters, comments } = collab.byPoint[pointId] ?? { voters: [], comments: [] };
  const me = collab.me;
  const mine = !!me && voters.includes(me);
  const [picking, setPicking] = useState(false);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 이름이 없을 때 누른 동작: 이름을 고르면 이어서 한다
  const [after, setAfter] = useState<"vote" | null>(null);

  function pick(n: string) {
    const v = n.trim().slice(0, 20);
    if (!v) return;
    collab.setMe(v);
    setPicking(false);
    if (after === "vote") void collab.toggleVote(pointId, v);
    setAfter(null);
  }

  async function send() {
    if (!me || !body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await collab.addComment(pointId, me, body.trim());
      setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("댓글을 남기지 못했어요."));
    } finally {
      setBusy(false);
    }
  }

  if (!canEdit && voters.length === 0 && comments.length === 0) return null;

  return (
    <section>
      <h3 className="mb-2 text-sm font-bold">{t("동행 의견")}</h3>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!canEdit}
          aria-pressed={mine}
          onClick={() => {
            if (!me) {
              setAfter("vote");
              setPicking(true);
            } else void collab.toggleVote(pointId, me);
          }}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition disabled:cursor-default ${
            mine ? "bg-primary text-white" : "bg-surface-muted text-foreground/80 hover:bg-primary-soft"
          }`}
        >
          <ThumbsUp size={15} fill={mine ? "currentColor" : "none"} aria-hidden /> {t("가고 싶어요")} {voters.length > 0 && voters.length}
        </button>
        {voters.length > 0 && <span className="text-xs text-foreground/68">{voters.join(", ")}</span>}
      </div>

      {comments.length > 0 && (
        <ul className="mt-3 space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="group flex gap-2 rounded-2xl bg-surface-muted px-3.5 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="text-xs">
                  <span className="font-bold">{c.author}</span>{" "}
                  <span className="text-foreground/60">{formatDistanceToNow(parseISO(c.created_at), { addSuffix: true, locale: df })}</span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => void collab.deleteComment(c.id)}
                  aria-label={t("댓글 지우기")}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-foreground/45 hover:bg-accent-soft hover:text-accent"
                >
                  <X size={13} aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit &&
        (picking || !me ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border-subtle p-3">
            <p className="mb-2 text-xs font-semibold text-foreground/72">{t("누구로 남길까요? 이 기기에 기억해요.")}</p>
            {travelers.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {travelers.map((n) => (
                  <button key={n} type="button" onClick={() => pick(n)} className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold hover:bg-primary-soft">
                    {n}
                  </button>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                pick(name);
              }}
              className="flex gap-2"
            >
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder={t("이름")} aria-label={t("이름")} className="input flex-1 py-2" />
              <button type="submit" disabled={!name.trim()} className="btn btn-primary px-4 text-sm disabled:opacity-40">
                {t("확인")}
              </button>
            </form>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="mt-3"
          >
            <div className="flex gap-2">
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={500}
                placeholder={t("이 장소 어때요? 의견을 남겨 보세요")}
                aria-label={t("댓글")}
                className="input flex-1 py-2"
              />
              <button type="submit" disabled={busy || !body.trim()} aria-label={t("보내기")} className="btn btn-primary px-3.5 disabled:opacity-40">
                <Send size={15} aria-hidden />
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-foreground/68">
              {t("{name}(으)로 남겨요", { name: me })}{" "}
              <button type="button" onClick={() => setPicking(true)} className="underline">
                {t("바꾸기")}
              </button>
            </p>
          </form>
        ))}
      {error && <p className="mt-2 text-xs text-accent">{error}</p>}
    </section>
  );
}
