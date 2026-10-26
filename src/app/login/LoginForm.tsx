"use client";

import { useState } from "react";
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
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5">
      <CoverPhoto country="스위스" className="opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-950/20 to-slate-950/60" />
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={error ? { x: [0, -10, 10, -6, 6, 0], opacity: 1, y: 0, scale: 1 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45 }}
        className="glass relative w-full max-w-sm rounded-[1.75rem] border border-white/40 p-7 shadow-lift"
      >
        <Logo />
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight">다시 떠날 준비, 되셨나요?</h1>
        <p className="mt-1.5 text-sm text-foreground/72">관리자는 비밀번호만, 체험 계정은 아이디와 비밀번호로 들어와요.</p>
        <label className="mt-6 block">
          <span className="sr-only">아이디</span>
          <div className="relative">
            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/55" />
            <input
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디 (관리자는 비워 두세요)"
              className="input pl-10"
            />
          </div>
        </label>
        <label className="mt-2 block">
          <span className="sr-only">비밀번호</span>
          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/55" />
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="input pl-10"
            />
          </div>
        </label>
        {error && <p className="mt-2 text-xs font-medium text-accent">{error}</p>}
        <button type="submit" disabled={!password || loading} className="btn btn-primary mt-5 w-full py-3 text-sm disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <>들어가기 <ArrowRight size={16} /></>}
        </button>
        <p className="mt-5 text-center text-xs text-foreground/60">
          공유 링크를 받으셨다면 그 링크로 바로 들어가면 돼요.
        </p>
      </motion.form>
    </main>
  );
}
