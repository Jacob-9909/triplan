import { getCountryBackground } from "@/data/countryBackgrounds";
import { useT } from "@/i18n/I18nProvider";
import { coverGradient, coverImage } from "./cover";

interface CoverPhotoProps {
  country?: string | null;
  continent?: string | null;
  /** 도시·지역 이름. 도시 사진이 있으면 나라 사진보다 먼저 쓴다 */
  city?: string | null;
  /** 제목(예: "교토 단풍"). 도시 이름이 들어 있으면 그 도시 사진을 쓴다 */
  title?: string | null;
  /** 사진 아래쪽을 어둡게 깔아 흰 글씨를 올릴 수 있게 */
  scrim?: boolean;
  className?: string;
  /** 사진 확대 정도 (hover 줌 등은 부모에서 group으로 제어) */
  zoomOnHover?: boolean;
  /** 직접 고른 커버 사진 주소. 있으면 도시·나라 사진보다 먼저 쓴다 */
  src?: string | null;
}

/**
 * 나라 대표 사진을 꽉 채워 까는 배경. 부모는 `relative overflow-hidden`이어야 한다.
 */
export default function CoverPhoto({
  country,
  continent,
  city,
  title,
  scrim = true,
  className = "",
  zoomOnHover = false,
  src = null,
}: CoverPhotoProps) {
  const t = useT();
  const label = city || country || title;
  const image = src || coverImage({ country, city, title });
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 select-none ${className}`}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- 로컬 정적 자산
        <img
          src={image}
          alt=""
          loading="lazy"
          draggable={false}
          className={`h-full w-full object-cover transition-transform duration-700 ease-out ${
            zoomOnHover ? "group-hover:scale-105" : ""
          }`}
        />
      ) : (
        // 사진이 없는 곳: 대륙 색 위에 등고선 무늬와 지명을 크게 깔아 빈 카드처럼 보이지 않게 한다
        <div className="relative h-full w-full overflow-hidden [container-type:size]" style={{ background: coverGradient(continent) }}>
          <div className="topo absolute inset-0 opacity-80 invert" />
          {label && (
            <span className="absolute left-[6%] top-[8%] max-w-[94%] select-none break-keep font-display text-[clamp(2.25rem,26cqmin,8rem)] font-extrabold leading-[0.95] tracking-tighter text-white/14">
              {t(label)}
            </span>
          )}
        </div>
      )}
      {scrim && <div className="photo-scrim absolute inset-0" />}
    </div>
  );
}

export function hasCountryPhoto(country?: string | null) {
  return getCountryBackground(country) !== null;
}
