"use client";

import { useEffect, useState } from "react";
import { Check, KeyRound, Loader2, Repeat, Trash2, UserPlus } from "lucide-react";
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

interface Member {
  id: string;
  username: string;
  role: "demo" | "user";
  created_at: string;
}

/** 회원 관리: 관리자가 정한 아이디/비밀번호만 로그인할 수 있다. 관리자는 ADMIN_PASSWORD 한 명뿐 */
export default function Members() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [asUser, setAsUser] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<Member[]>("/api/members")
      .then(setMembers)
      .catch(() => setMembers([]));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const m = await apiPost<Member>("/api/members", {
        username,
        password,
        role: asUser ? "user" : "demo",
      });
      setMembers((list) => [m, ...(list ?? [])]);
      setUsername("");
      setPassword("");
      setAsUser(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "회원을 만들지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRole(m: Member) {
    const updated = await apiPatch<Member>(`/api/members/${m.id}`, {
      role: m.role === "user" ? "demo" : "user",
    });
    setMembers((list) => (list ?? []).map((x) => (x.id === m.id ? updated : x)));
  }

  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [resetMsg, setResetMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  async function resetPassword(e: React.FormEvent, m: Member) {
    e.preventDefault();
    try {
      await apiPatch(`/api/members/${m.id}`, { password: resetPw });
      setResetMsg({ id: m.id, text: "바꿨어요. 그 회원의 기존 로그인은 모두 풀렸어요.", ok: true });
      setResetId(null);
      setResetPw("");
    } catch (err) {
      setResetMsg({ id: m.id, text: err instanceof ApiError ? err.message : "바꾸지 못했어요.", ok: false });
    }
  }

  async function remove(m: Member) {
    await apiDelete(`/api/members/${m.id}`);
    setMembers((list) => (list ?? []).filter((x) => x.id !== m.id));
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <p className="eyebrow">관리자</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight">회원 관리</h1>
      <p className="mt-1 text-sm text-foreground/65">
        <b>사용</b> 회원은 자기 여행과 가고 싶은 곳을 만들고, 다른 사용 회원을 여행에 초대해 함께 편집해요. 회원 관리는
        못 해요. <b>체험</b> 회원은 공유 창에서 &lsquo;체험 회원에게 공개&rsquo;를 켠 여행만 보기 전용으로 보고, 장소
        검색·번역·환율은 못 써요.
      </p>

      <form onSubmit={add} className="card mt-6 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end md:p-5">
        <h2 className="font-bold sm:col-span-3">새 회원</h2>
        <div>
          <label htmlFor="new-username" className="field-label">
            아이디
          </label>
          <input
            id="new-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="영문·숫자 3~32자"
            autoComplete="off"
            autoCapitalize="none"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="new-password" className="field-label">
            비밀번호
          </label>
          <input
            id="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6자 이상"
            autoComplete="new-password"
            className="input"
          />
        </div>
        <button
          type="submit"
          disabled={!username || !password || saving}
          className="btn btn-primary min-h-11 px-5 text-sm disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <UserPlus size={16} /> 추가
            </>
          )}
        </button>
        <label className="flex items-center gap-2 text-sm sm:col-span-3">
          <input
            type="checkbox"
            checked={asUser}
            onChange={(e) => setAsUser(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          사용 권한 주기 (끄면 체험 계정)
        </label>
        {error && <p className="text-xs font-medium text-accent sm:col-span-3">{error}</p>}
      </form>

      <h2 className="mt-8 font-bold">
        회원 <span className="font-mono text-sm text-foreground/68">{members?.length ?? ""}</span>
      </h2>
      <ul className="card mt-3 divide-y divide-border-subtle">
        {members === null && <li className="p-4 text-sm text-foreground/68">불러오는 중…</li>}
        {members?.length === 0 && <li className="p-4 text-sm text-foreground/68">아직 회원이 없어요.</li>}
        {members?.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="flex items-center gap-1.5 font-semibold">
                {m.username}
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    m.role === "user" ? "bg-primary-soft text-primary-strong" : "bg-surface-muted text-foreground/68"
                  }`}
                >
                  {m.role === "user" ? "사용" : "체험"}
                </span>
              </p>
              <p className="text-xs text-foreground/68">{new Date(m.created_at).toLocaleDateString("ko-KR")} 생성</p>
            </div>
            <span className="flex items-center gap-1">
              <button
                onClick={() => {
                  setResetId(resetId === m.id ? null : m.id);
                  setResetPw("");
                  setResetMsg(null);
                }}
                className="inline-flex min-h-9 items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-foreground/70 transition hover:bg-surface-muted hover:text-foreground"
              >
                <KeyRound size={13} /> 비밀번호 초기화
              </button>
              <button
                onClick={() => void toggleRole(m)}
                className="inline-flex min-h-9 items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-foreground/70 transition hover:bg-surface-muted hover:text-foreground"
              >
                <Repeat size={13} /> {m.role === "user" ? "체험으로 바꾸기" : "사용 권한 주기"}
              </button>
              <button
                onClick={() => void remove(m)}
                aria-label={`${m.username} 삭제`}
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/68 transition hover:bg-accent-soft hover:text-accent"
              >
                <Trash2 size={16} />
              </button>
            </span>
            {resetId === m.id && (
              <form onSubmit={(e) => void resetPassword(e, m)} className="flex w-full gap-2">
                <input
                  value={resetPw}
                  onChange={(e) => setResetPw(e.target.value)}
                  aria-label="새 비밀번호"
                  placeholder="새 비밀번호 (6자 이상)"
                  autoComplete="new-password"
                  autoFocus
                  className="input flex-1"
                />
                <button
                  type="submit"
                  disabled={resetPw.length < 6}
                  className="btn btn-primary shrink-0 px-4 py-2 text-sm disabled:opacity-50"
                >
                  <Check size={15} /> 바꾸기
                </button>
              </form>
            )}
            {resetMsg?.id === m.id && (
              <p className={`w-full text-xs font-medium ${resetMsg.ok ? "text-mint" : "text-accent"}`}>
                {resetMsg.text}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
