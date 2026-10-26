"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { ApiError, apiDelete, apiGet, apiPost } from "@/lib/api";

interface Member {
  id: string;
  username: string;
  created_at: string;
}

/** 체험 회원 관리: 관리자가 정한 아이디/비밀번호만 로그인할 수 있다 */
export default function Members() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<Member[]>("/api/members").then(setMembers).catch(() => setMembers([]));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const m = await apiPost<Member>("/api/members", { username, password });
      setMembers((list) => [m, ...(list ?? [])]);
      setUsername("");
      setPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "회원을 만들지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(m: Member) {
    await apiDelete(`/api/members/${m.id}`);
    setMembers((list) => (list ?? []).filter((x) => x.id !== m.id));
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight">회원 관리</h1>
      <p className="mt-1 text-sm text-foreground/65">
        체험 회원은 공유 창에서 &lsquo;체험 회원에게 공개&rsquo;를 켠 여행만 보기 전용으로 볼 수 있어요. 장소 검색·번역·환율은 못 써요.
      </p>

      <form onSubmit={add} className="mt-6 grid gap-2 rounded-2xl border border-border-subtle p-4 sm:grid-cols-[1fr_1fr_auto]">
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
        <button type="submit" disabled={!username || !password || saving} className="btn btn-primary px-4 py-2 text-sm disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <><UserPlus size={16} /> 추가</>}
        </button>
        {error && <p className="text-xs font-medium text-accent sm:col-span-3">{error}</p>}
      </form>

      <ul className="mt-4 divide-y divide-border-subtle rounded-2xl border border-border-subtle">
        {members === null && <li className="p-4 text-sm text-foreground/60">불러오는 중…</li>}
        {members?.length === 0 && <li className="p-4 text-sm text-foreground/60">아직 회원이 없어요.</li>}
        {members?.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">{m.username}</p>
              <p className="text-xs text-foreground/60">{new Date(m.created_at).toLocaleDateString("ko-KR")} 생성</p>
            </div>
            <button
              onClick={() => void remove(m)}
              aria-label={`${m.username} 삭제`}
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/60 transition hover:bg-accent-soft hover:text-accent"
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
