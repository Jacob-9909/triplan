import type { ReactNode } from "react";

/** 검색 패널 전반에서 공유하는 카드/입력/버튼 스타일 */
export const searchCardClass = "card p-4 sm:p-5 lg:p-6";

export const searchInputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm outline-none transition focus:border-[var(--color-primary)] focus:bg-white";

export const searchLabelClass =
  "mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]/60";

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-strong)] disabled:opacity-50";

interface SearchCardProps {
  children: ReactNode;
  className?: string;
}

/** 항공권/숙소 결과·링크 카드의 공통 래퍼 */
export default function SearchCard({ children, className = "" }: SearchCardProps) {
  return (
    <div className={`${searchCardClass} ${className}`}>
      {children}
    </div>
  );
}
