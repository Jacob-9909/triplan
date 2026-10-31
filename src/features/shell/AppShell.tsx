"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, Home, LogOut, NotebookPen, Plus, UserRound, Users } from "lucide-react";
import type { ReactNode } from "react";
import type { ShellRole } from "@/lib/types";

const ALL_NAV = [
  { href: "/", label: "홈", icon: Home },
  { href: "/wishlist", label: "가고 싶은 곳", icon: Heart },
  { href: "/archive", label: "기록", icon: NotebookPen },
  { href: "/members", label: "회원", icon: Users },
  { href: "/account", label: "내 계정", icon: UserRound },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** 여행 상세(/trips/<id>, /demo/<id>)는 사진 헤더에 뒤로 가기가 있어 모바일에서 앱 바를 숨긴다 */
function isTripDetail(pathname: string) {
  return /^\/(trips|demo)\/(?!new$)[^/]+$/.test(pathname);
}

export function Logo({ className = "", tone = "ink" }: { className?: string; tone?: "ink" | "light" }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-display text-lg font-extrabold tracking-tight ${
        tone === "light" ? "text-white" : "text-foreground"
      } ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 정적 SVG 아이콘 */}
      <img src="/icon.svg" alt="" className="h-8 w-8 rounded-[10px]" />
      Triplan
    </span>
  );
}

/**
 * 로그인 화면 공통 틀: 데스크톱 상단 바 + 모바일 상단 로고 + 모바일 하단 탭바.
 * admin 은 회원 메뉴까지, user 는 내 계정, demo 는 메뉴 없이 로고와 로그아웃만
 */
export default function AppShell({ children, role }: { children: ReactNode; role: ShellRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const member = role === "demo";
  // 관리자는 회원 관리, 사용 회원은 내 계정 (관리자 비밀번호는 서버 설정이라 계정 화면이 없다)
  const NAV = ALL_NAV.filter((n) => n.href !== (role === "admin" ? "/account" : "/members"));
  const tripDetail = isTripDetail(pathname);
  const showTabBar = !member && !tripDetail;

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
          <Link href="/" aria-label="Triplan 홈" className="rounded-xl">
            <Logo />
          </Link>
          {!member && (
            <nav aria-label="주요 메뉴" className="flex gap-1">
              {NAV.map(({ href, label }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      active ? "text-white" : "text-foreground/68 hover:text-foreground"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full bg-foreground"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                    <span className="relative">{label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-2">
            {member ? (
              <span className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-bold text-foreground/70">체험 계정</span>
            ) : (
              <Link href="/trips/new" className="btn btn-primary px-4 text-sm">
                <Plus size={16} aria-hidden /> 새 여행
              </Link>
            )}
            <button
              onClick={logout}
              aria-label="로그아웃"
              title="로그아웃"
              className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/65 transition hover:bg-surface-muted hover:text-foreground"
            >
              <LogOut size={18} aria-hidden />
            </button>
          </div>
        </div>
      </header>

      {/* 모바일 상단: 여행 상세에서는 숨긴다 */}
      {!tripDetail && (
        <header className="flex items-center justify-between px-4 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))] md:hidden">
          <Link href="/" aria-label="Triplan 홈" className="rounded-xl">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            {member && (
              <span className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-bold text-foreground/70">체험 계정</span>
            )}
            <button
              onClick={logout}
              aria-label="로그아웃"
              className="flex h-11 w-11 items-center justify-center rounded-full text-foreground/65 active:bg-surface-muted"
            >
              <LogOut size={18} aria-hidden />
            </button>
          </div>
        </header>
      )}

      <main
        className={`flex-1 md:pb-14 ${
          showTabBar ? "pb-[calc(var(--nav-height)+env(safe-area-inset-bottom)+1.5rem)]" : "pb-[env(safe-area-inset-bottom)]"
        }`}
      >
        {children}
      </main>

      {/* 모바일 하단 탭바 */}
      {showTabBar && (
        <nav
          aria-label="주요 메뉴"
          className="glass fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          <div className="mx-auto grid h-[var(--nav-height)] max-w-md grid-cols-5 items-center">
            {NAV.slice(0, 2).map((item) => (
              <TabItem key={item.href} {...item} active={isActive(pathname, item.href)} />
            ))}
            <div className="flex justify-center">
              <Link
                href="/trips/new"
                aria-label="새 여행"
                className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lift ring-4 ring-background transition active:scale-95"
              >
                <Plus size={26} aria-hidden />
              </Link>
            </div>
            {NAV.slice(2).map((item) => (
              <TabItem key={item.href} {...item} active={isActive(pathname, item.href)} />
            ))}
          </div>
        </nav>
      )}
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
      aria-current={active ? "page" : undefined}
      className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
        active ? "text-foreground" : "text-foreground/68"
      }`}
    >
      <motion.span
        animate={{ scale: active ? 1.08 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className={`flex h-7 w-12 items-center justify-center rounded-full ${active ? "bg-primary-soft text-primary-strong" : ""}`}
      >
        <Icon size={21} strokeWidth={active ? 2.4 : 2} fill={active && href === "/wishlist" ? "currentColor" : "none"} aria-hidden />
      </motion.span>
      {label}
    </Link>
  );
}
