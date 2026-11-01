import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "./providers";
import { getCurrency, getLocale, getT, getTheme } from "@/i18n/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Triplan — 가고 싶은 곳부터 함께 짜는 여행까지"),
    description: t(
      "가고 싶은 곳을 모아 두고, 지도·일정·가계부·준비물로 여행을 계획하고, 링크 하나로 동행자와 함께 편집하는 여행 플래너"
    ),
    appleWebApp: { capable: true, title: "Triplan", statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf7f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1726" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, theme, currency] = await Promise.all([getLocale(), getTheme(), getCurrency()]);
  return (
    <html
      lang={locale}
      data-theme={theme === "system" ? undefined : theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* 한글 본문 폰트: Pretendard (동적 서브셋) */}
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <Providers locale={locale} theme={theme} currency={currency}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
