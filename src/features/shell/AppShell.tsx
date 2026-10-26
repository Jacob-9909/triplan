"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, Home, LogOut, Plus, Users } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { href: "/", label: "홈", icon: Home },
  { href: "/wishlist", label: "가고 싶은 곳", icon: Heart },
  { href: "/members", label: "회원", icon: Users },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-lg font-extrabold tracking-tight ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 정적 SVG 아이콘 */}
      <img src="/icon.svg" alt="" className="h-7 w-7 rounded-lg" />
      Triplan
    </span>
  );
}

/** 관리자 화면 공통 틀: 데스크톱 상단 바 + 모바일 하단 탭바. member면 메뉴 없이 로고와 로그아웃만 */
export default function AppShell({ children, member = false }: { children: ReactNode; member?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* 데스크톱 상단 바 */}
      <header className="glass sticky top-0 z-40 hidden border-b border-border-subtle md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
          <Link href="/" aria-label="Triplan 홈">
            <Logo />
          </Link>
          {!member && <nav className="flex gap-1">
            {NAV.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    active ? "text-primary-strong" : "text-foreground/65 hover:text-foreground"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-primary-soft"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <span className="relative">{label}</span>
                </Link>
              );
            })}
          </nav>}
          <div className="ml-auto flex items-center gap-2">
            {member ? (
              <span className="text-sm font-semibold text-foreground/60">체험 계정</span>
            ) : (
              <Link href="/trips/new" className="btn btn-primary px-4 py-2 text-sm">
                <Plus size={16} /> 새 여행
              </Link>
            )}
            <button
              onClick={logout}
              aria-label="로그아웃"
              title="로그아웃"
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/60 transition hover:bg-surface-muted hover:text-foreground"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      {/* 모바일 상단 */}
      <header className="flex items-center justify-between px-4 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))] md:hidden">
        <Link href="/" aria-label="Triplan 홈">
          <Logo />
        </Link>
        <button
          onClick={logout}
          aria-label="로그아웃"
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/60"
        >
          <LogOut size={17} />
        </button>
      </header>

      <main className="flex-1 pb-[calc(var(--nav-height)+env(safe-area-inset-bottom)+1rem)] md:pb-12">
        {children}
      </main>

      {/* 모바일 하단 탭바 */}
      {!member && <nav
        aria-label="주요 메뉴"
        className="glass fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="mx-auto grid h-[var(--nav-height)] max-w-md grid-cols-4 items-center">
          {NAV.slice(0, 1).map((item) => (
            <TabItem key={item.href} {...item} active={isActive(pathname, item.href)} />
          ))}
          <div className="flex justify-center">
            <Link
              href="/trips/new"
              aria-label="새 여행"
              className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lift ring-4 ring-background transition active:scale-95"
            >
              <Plus size={26} />
            </Link>
          </div>
          {NAV.slice(1).map((item) => (
            <TabItem key={item.href} {...item} active={isActive(pathname, item.href)} />
          ))}
        </div>
      </nav>}
    </div>
  );
}

function TabItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 text-[11px] font-semibold transition-colors ${
        active ? "text-primary-strong" : "text-foreground/60"
      }`}
    >
      <motion.span animate={{ scale: active ? 1.12 : 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
        <Icon size={22} strokeWidth={active ? 2.4 : 2} fill={active && href === "/wishlist" ? "currentColor" : "none"} />
      </motion.span>
      {label}
    </Link>
  );
}
