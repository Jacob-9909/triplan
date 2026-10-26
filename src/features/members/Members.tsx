"use client";

import { useEffect, useState } from "react";
import { Loader2, Shield, Trash2, UserPlus } from "lucide-react";
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

interface Member {
  id: string;
  username: string;
  is_admin: boolean;
  created_at: string;
}

/** 회원 관리: 관리자가 정한 아이디/비밀번호만 로그인할 수 있다. 관리자 권한을 주면 관리자와 똑같이 쓴다 */
export default function Members() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [asAdmin, setAsAdmin] = useState(false);
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
        is_admin: asAdmin,
      });
      setMembers((list) => [m, ...(list ?? [])]);
      setUsername("");
      setPassword("");
      setAsAdmin(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "회원을 만들지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAdmin(m: Member) {
    const updated = await apiPatch<Member>(`/api/members/${m.id}`, {
      is_admin: !m.is_admin,
    });
    setMembers((list) => (list ?? []).map((x) => (x.id === m.id ? updated : x)));
  }

  async function remove(m: Member) {
    await apiDelete(`/api/members/${m.id}`);
    setMembers((list) => (list ?? []).filter((x) => x.id !== m.id));
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight">회원 관리</h1>
      <p className="mt-1 text-sm text-foreground/65">
        체험 회원은 공유 창에서 &lsquo;체험 회원에게 공개&rsquo;를 켠 여행만 보기 전용으로 볼 수 있어요. 장소
        검색·번역·환율은 못 써요. 관리자 권한을 주면 여행·위시리스트·회원 관리까지 관리자와 똑같이 쓸 수 있어요.
      </p>

      <form
        onSubmit={add}
        className="mt-6 grid gap-2 rounded-2xl border border-border-subtle p-4 sm:grid-cols-[1fr_1fr_auto]"
      >
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="아이디"
          autoComplete="off"
          className="input"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 (6자 이상)"
          autoComplete="new-password"
          className="input"
        />
        <button
          type="submit"
          disabled={!username || !password || saving}
          className="btn btn-primary px-4 py-2 text-sm disabled:opacity-50"
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
            checked={asAdmin}
            onChange={(e) => setAsAdmin(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          관리자 권한 주기
        </label>
        {error && <p className="text-xs font-medium text-accent sm:col-span-3">{error}</p>}
      </form>

      <ul className="mt-4 divide-y divide-border-subtle rounded-2xl border border-border-subtle">
        {members === null && <li className="p-4 text-sm text-foreground/60">불러오는 중…</li>}
        {members?.length === 0 && <li className="p-4 text-sm text-foreground/60">아직 회원이 없어요.</li>}
        {members?.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="flex items-center gap-1.5 font-semibold">
                {m.username}
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    m.is_admin ? "bg-primary-soft text-primary-strong" : "bg-surface-muted text-foreground/60"
                  }`}
                >
                  {m.is_admin ? "관리자" : "체험"}
                </span>
              </p>
              <p className="text-xs text-foreground/60">{new Date(m.created_at).toLocaleDateString("ko-KR")} 생성</p>
            </div>
            <span className="flex items-center gap-1">
              <button
                onClick={() => void toggleAdmin(m)}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground/65 transition hover:bg-surface-muted hover:text-foreground"
              >
                <Shield size={13} /> {m.is_admin ? "관리자 권한 빼기" : "관리자 권한 주기"}
              </button>
              <button
                onClick={() => void remove(m)}
                aria-label={`${m.username} 삭제`}
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/60 transition hover:bg-accent-soft hover:text-accent"
              >
                <Trash2 size={16} />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
