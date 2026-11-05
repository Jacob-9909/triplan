"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Logo } from "@/features/shell/AppShell";
import CoverPhoto from "@/features/ui/CoverPhoto";
import PrefsToggle from "@/i18n/PrefsToggle";
import { useT } from "@/i18n/I18nProvider";
import "./landing.css";

const PLACES = [
  { country: "그리스", city: undefined, caption: "산토리니, 그리스" }, // i18n-ignore: country·city 는 사진 조회 키
  { country: "일본", city: "교토", caption: "교토, 일본" }, // i18n-ignore: country·city 는 사진 조회 키
  { country: "이탈리아", city: "베네치아", caption: "베네치아, 이탈리아" }, // i18n-ignore: country·city 는 사진 조회 키
  { country: "스위스", city: "인터라켄", caption: "인터라켄, 스위스" }, // i18n-ignore: country·city 는 사진 조회 키
  { country: "호주", city: "시드니", caption: "시드니, 호주" }, // i18n-ignore: country·city 는 사진 조회 키
];

// 제품 화면 샘플: 실제 화면을 캡처하면 data-slot 자리를 그 이미지로 바꾼다
const STOPS = [
  { name: "기요미즈데라", time: "09:00", x: 22, y: 30 },
  { name: "니넨자카", time: "11:30", x: 44, y: 52 },
  { name: "기온 거리", time: "14:00", x: 63, y: 38 },
  { name: "가모가와 강변", time: "17:30", x: 80, y: 66 },
];
const BUDGET = [
  { label: "숙소", amount: "₩420,000" },
  { label: "교통", amount: "₩180,000" },
  { label: "식비", amount: "₩150,000" },
];
const PACKING = [
  { label: "여권", done: true },
  { label: "충전기", done: true },
  { label: "우산", done: false },
  { label: "교통카드", done: false },
];

export default function Landing() {
  const t = useT();
  const hero = PLACES[0];

  return (
    <main className="landing">
      <header className="l-nav">
        <div className="l-container l-nav__row">
          <Logo tone="light" />
          <PrefsToggle tone="light" className="l-nav__prefs" />
          <Link href="/login" className="l-btn l-btn--on-dark">
            {t("로그인")}
          </Link>
        </div>
      </header>

      <section className="l-hero">
        <CoverPhoto country={hero.country} city={hero.city} scrim={false} />
        <div className="l-hero__scrim" aria-hidden />
        <div className="l-container l-hero__inner">
          <div className="l-hero__copy">
            <h1>
              {t("가고 싶은 곳에서")}
              <br />
              {t("함께 떠나는 여행까지.")}
            </h1>
            <p className="lead">{t("꿈꾸던 여행지를 모아 두고, 지도 위에서 하루씩 계획하고, 링크 하나로 동행자와 나눠요.")}</p>
            <Link href="/login" className="l-btn l-btn--primary">
              {t("내 여행 열기")}
            </Link>
          </div>
          <p className="l-hero__credit">{t(hero.caption)}</p>
        </div>
      </section>

      <section className="l-tools">
        <div className="l-container">
          <h2>{t("여행 준비의 처음부터 끝까지, 한 화면에서")}</h2>
          <div className="l-bento">
            <article className="l-tile l-tile--lead">
              <h3>{t("지도 위에서 하루씩 계획")}</h3>
              <p>{t("장소를 검색해 핀을 꽂고, 드래그로 동선을 정리해요.")}</p>
              <div className="l-screen" data-slot="plan" data-kind="product" data-alt={t("일정 탭: 지도 위 핀과 하루 동선")}>
                <div className="l-map" aria-hidden>
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="l-map__base">
                    <path className="l-map__street" d="M0 20 L100 26 M0 46 L100 50 M0 74 L100 78 M18 0 L24 100 M40 0 L46 100 M60 0 L64 100" />
                    <path className="l-map__river" d="M90 0 C86 22 92 40 86 58 S82 86 88 100" />
                  </svg>
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="l-map__route">
                    <polyline points={STOPS.map((s) => `${s.x},${s.y}`).join(" ")} />
                  </svg>
                  {STOPS.map((s, idx) => (
                    <span key={s.name} className="l-map__pin" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
                      {idx + 1}
                    </span>
                  ))}
                </div>
                <div className="l-day">
                  <p className="l-day__title">{t("교토, 1일차")}</p>
                  <ol className="l-day__stops">
                    {STOPS.map((s) => (
                      <li key={s.name}>
                        <span>{t(s.name)}</span>
                        <time className="num">{s.time}</time>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </article>

            <article className="l-tile">
              <h3>{t("가계부")}</h3>
              <div className="l-screen" data-slot="budget" data-kind="product" data-alt={t("가계부 탭: 항목별 지출")}>
                <table className="l-budget">
                  <tbody>
                    {BUDGET.map((b) => (
                      <tr key={b.label}>
                        <th scope="row">{t(b.label)}</th>
                        <td className="num">{b.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row">{t("합계")}</th>
                      <td className="num">₩750,000</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </article>

            <article className="l-tile">
              <h3>{t("준비물")}</h3>
              <div className="l-screen" data-slot="packing" data-kind="product" data-alt={t("준비물 탭: 체크리스트")}>
                <ul className="l-pack">
                  {PACKING.map((p) => (
                    <li key={p.label} data-done={p.done || undefined}>
                      <span className="l-pack__box" aria-hidden>
                        {p.done && <Check size={14} strokeWidth={3} />}
                      </span>
                      {t(p.label)}
                      {p.done && <span className="visually-hidden">{t("챙김")}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <article className="l-tile l-tile--wide">
              <div className="l-tile__text">
                <h3>{t("링크 하나로 함께 편집")}</h3>
                <p>{t("동행자는 초대하거나 편집 링크로, 가족은 보기 링크로. 누가 고치면 모두의 화면에 바로 보여요.")}</p>
              </div>
              <div className="l-screen" data-slot="share" data-kind="product" data-alt={t("공유 창: 편집 링크와 보기 링크")}>
                <dl className="l-links">
                  <div>
                    <dt>{t("편집 링크")}</dt>
                    <dd>
                      <code>/t/a8f3k2</code>
                    </dd>
                  </div>
                  <div>
                    <dt>{t("보기 링크")}</dt>
                    <dd>
                      <code>/v/9mq1x7</code>
                    </dd>
                  </div>
                </dl>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="l-places">
        <div className="l-container l-places__head">
          <h2>{t("가고 싶은 곳을 모아 두기")}</h2>
          <p className="lead">
            {t("언젠가 가 보고 싶은 나라와 도시를 세계지도에 핀으로 저장해요. 마음이 정해지면 바로 여행으로 바꿔요.")}
          </p>
        </div>
        <ul className="l-rail" tabIndex={0} aria-label={t("가고 싶은 곳을 모아 두기")}>
          {PLACES.map((p) => (
            <li key={p.caption}>
              <figure>
                <div className="l-rail__photo">
                  <CoverPhoto country={p.country} city={p.city} scrim={false} />
                </div>
                <figcaption>{t(p.caption)}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>

      <footer className="l-foot">
        <div className="l-container">
          <p className="l-foot__line">{t("가고 싶은 곳을 모으고 함께 계획하는 여행 플래너")}</p>
          <Link href="/login" className="l-btn l-btn--primary">
            {t("내 여행 열기")}
          </Link>
          <div className="l-foot__mark">
            <Logo />
          </div>
        </div>
      </footer>
    </main>
  );
}
