"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { ApiError, apiPost } from "@/lib/api";

/** 내 계정: 비밀번호 바꾸기. 바꾸면 다른 기기의 로그인은 풀린다 */
export default function Account({ username }: { username: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const mismatch = confirm.length > 0 && next !== confirm;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || mismatch) return;
    setSaving(true);
    setMsg(null);
    try {
      await apiPost("/api/account/password", { current, next });
      setMsg({ text: "비밀번호를 바꿨어요. 다른 기기에서는 다시 로그인해야 해요.", ok: true });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setMsg({ text: err instanceof ApiError ? err.message : "바꾸지 못했어요.", ok: false });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6 md:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight">내 계정</h1>
      <p className="mt-1 text-sm text-foreground/65">
        아이디 <b>{username}</b>
      </p>

      <form onSubmit={submit} className="mt-6 space-y-2 rounded-2xl border border-border-subtle p-4">
        <h2 className="font-bold">비밀번호 바꾸기</h2>
        {/* 비밀번호 관리자가 계정을 알아보도록 아이디를 숨겨 둔다 */}
        <input type="text" name="username" autoComplete="username" value={username} readOnly hidden />
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="지금 비밀번호"
          autoComplete="current-password"
          className="input"
        />
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="새 비밀번호 (6자 이상)"
          autoComplete="new-password"
          className="input"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="새 비밀번호 한 번 더"
          autoComplete="new-password"
          className="input"
        />
        {mismatch && <p className="text-xs font-medium text-accent">새 비밀번호가 서로 달라요.</p>}
        {msg && <p className={`text-xs font-medium ${msg.ok ? "text-emerald-600" : "text-accent"}`}>{msg.text}</p>}
        <button
          type="submit"
          disabled={!current || next.length < 6 || next !== confirm || saving}
          className="btn btn-primary w-full py-2.5 text-sm disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> 바꾸기</>}
        </button>
      </form>
    </div>
  );
}
