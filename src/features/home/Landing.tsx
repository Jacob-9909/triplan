"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Heart, Map, MapPin, Users } from "lucide-react";
import { Logo } from "@/features/shell/AppShell";
import CoverPhoto from "@/features/ui/CoverPhoto";

const SLIDES = [
  { country: "그리스", city: undefined, caption: "산토리니 · 그리스" },
  { country: "일본", city: "교토", caption: "교토 · 일본" },
  { country: "이탈리아", city: "베네치아", caption: "베네치아 · 이탈리아" },
  { country: "스위스", city: "인터라켄", caption: "인터라켄 · 스위스" },
  { country: "호주", city: "시드니", caption: "시드니 · 호주" },
];

const FEATURES = [
  {
    icon: Heart,
    title: "가고 싶은 곳을 모아 두기",
    body: "언젠가 가 보고 싶은 나라와 도시를 세계지도에 핀으로 저장해요. 마음이 정해지면 바로 여행으로 바꿔요.",
    tone: "bg-primary-soft text-primary-strong",
  },
  {
    icon: Map,
    title: "지도 위에서 하루씩 계획",
    body: "장소를 검색해 핀을 꽂고, 드래그로 동선을 정리하고, 가계부와 준비물까지 한곳에서 챙겨요.",
    tone: "bg-teal-soft text-mint",
  },
  {
    icon: Users,
    title: "링크 하나로 함께 편집",
    body: "동행자는 초대하거나 편집 링크로, 가족은 보기 링크로. 누가 고치면 모두의 화면에 바로 보여요.",
    tone: "bg-surface-muted text-foreground",
  },
];

export default function Landing() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % SLIDES.length), 5200);
    return () => clearInterval(t);
  }, []);
  const slide = SLIDES[i];

  return (
    <main className="min-h-dvh">
      {/* 히어로: 사진이 천천히 확대되며 바뀌는 슬라이드 */}
      <section className="relative isolate flex min-h-[88dvh] flex-col overflow-hidden text-white">
        <AnimatePresence mode="sync">
          <motion.div
            key={slide.caption}
            className="absolute inset-0 -z-10"
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 1.2 }, scale: { duration: 6.5, ease: "linear" } }}
          >
            <CoverPhoto country={slide.country} city={slide.city} scrim={false} />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/50 via-slate-950/5 to-slate-950/80" />

        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] md:px-8">
          <Logo tone="light" />
          <Link href="/login" className="btn bg-white/15 px-4 text-sm text-white backdrop-blur-md hover:bg-white/25">
            로그인
          </Link>
        </header>

        <div className="mx-auto mt-auto w-full max-w-6xl px-5 pb-14 md:px-8 md:pb-20">
          <motion.p
            key={slide.caption}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-md"
          >
            <MapPin size={12} aria-hidden /> {slide.caption}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            className="mt-3 max-w-2xl text-4xl font-extrabold leading-[1.15] tracking-tight md:text-6xl"
          >
            가고 싶은 곳에서
            <br />
            함께 떠나는 여행까지.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7 }}
            className="mt-4 max-w-md text-base text-white/88 md:text-lg"
          >
            꿈꾸던 여행지를 모아 두고, 지도 위에서 하루씩 계획하고, 링크 하나로 동행자와 나눠요.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="mt-8 flex items-center gap-4"
          >
            <Link href="/login" className="btn btn-primary px-6 py-3.5 text-sm">
              내 여행 열기 <ArrowRight size={16} />
            </Link>
            <div className="flex gap-1.5" aria-hidden>
              {SLIDES.map((s, idx) => (
                <span
                  key={s.caption}
                  className={`h-1.5 rounded-full bg-white transition-all duration-500 ${idx === i ? "w-6 opacity-100" : "w-1.5 opacity-40"}`}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 기능 소개 */}
      <section className="topo">
       <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
        <p className="eyebrow">이렇게 써요</p>
        <h2 className="mt-2 max-w-md text-2xl font-extrabold tracking-tight md:text-3xl">
          여행 준비의 처음부터 끝까지, 한 화면에서
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body, tone }, idx) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: idx * 0.1, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              className="card p-6"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
                <Icon size={21} />
              </span>
              <p className="mt-5 font-mono text-xs font-semibold text-foreground/68">0{idx + 1}</p>
              <h3 className="mt-1 text-lg font-bold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/72">{body}</p>
            </motion.article>
          ))}
        </div>
       </div>
      </section>

      <footer className="border-t border-border-subtle py-8 text-center text-xs text-foreground/68">
        Triplan · 가고 싶은 곳을 모으고 함께 계획하는 여행 플래너
      </footer>
    </main>
  );
}
