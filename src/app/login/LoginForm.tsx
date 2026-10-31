"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Lock, User } from "lucide-react";
import { Logo } from "@/features/shell/AppShell";
import CoverPhoto from "@/features/ui/CoverPhoto";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      router.replace("/");
      router.refresh();
      return;
    }
    const body = await res.json().catch(() => null);
    setError(body?.error ?? "로그인하지 못했어요.");
    setLoading(false);
  }

  return (
    <main className="grid min-h-dvh md:grid-cols-[1.1fr_1fr]">
      {/* 사진 */}
      <div className="relative h-56 overflow-hidden md:h-auto">
        <CoverPhoto country="스위스" city="인터라켄" />
        <div className="absolute inset-x-0 top-0 p-5 pt-[max(1.25rem,env(safe-area-inset-top))] md:p-10">
          <Link href="/" aria-label="Triplan 소개로" className="inline-block rounded-xl">
            <Logo tone="light" />
          </Link>
        </div>
        <p className="absolute bottom-5 left-5 hidden max-w-sm text-3xl font-extrabold leading-tight tracking-tight text-white md:bottom-10 md:left-10 md:block">
          다음 여행도
          <br />
          지도 위에서 같이 짜요.
        </p>
      </div>

      {/* 폼 */}
      <div className="topo relative -mt-6 flex items-start justify-center rounded-t-[1.75rem] bg-background px-5 pb-10 pt-8 md:mt-0 md:items-center md:rounded-none md:px-10">
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 16 }}
          animate={error ? { x: [0, -8, 8, -5, 5, 0], opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <p className="eyebrow">로그인</p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight md:text-3xl">다시 떠날 준비, 되셨나요?</h1>
          <p className="mt-2 text-sm text-foreground/68">관리자는 비밀번호만, 회원은 아이디와 비밀번호를 넣어요.</p>

          <label htmlFor="login-username" className="field-label mt-6">
            아이디 <span className="font-normal text-foreground/68">(관리자는 비워 두세요)</span>
          </label>
          <div className="relative">
            <User size={16} aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/68" />
            <input
              id="login-username"
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input pl-10"
            />
          </div>

          <label htmlFor="login-password" className="field-label mt-4">
            비밀번호
          </label>
          <div className="relative">
            <Lock size={16} aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/68" />
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
              className="input pl-10"
            />
          </div>
          {error && (
            <p id="login-error" role="alert" className="mt-2 text-sm font-medium text-accent">
              {error}
            </p>
          )}
          <button type="submit" disabled={!password || loading} className="btn btn-primary mt-6 w-full py-3 text-sm disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" aria-label="로그인 중" /> : <>들어가기 <ArrowRight size={16} aria-hidden /></>}
          </button>
          <p className="mt-6 rounded-2xl bg-surface-muted px-4 py-3 text-xs leading-relaxed text-foreground/70">
            공유 링크를 받으셨다면 로그인 없이 그 링크로 바로 들어가면 돼요.
          </p>
        </motion.form>
      </div>
    </main>
  );
}
