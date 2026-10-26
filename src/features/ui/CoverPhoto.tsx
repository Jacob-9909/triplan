import { getCountryBackground } from "@/data/countryBackgrounds";

/** 사진이 없는 나라용 대륙별 그라디언트 */
const CONTINENT_GRADIENTS: Record<string, string> = {
  아시아: "linear-gradient(135deg, #ff9a8b 0%, #ff6a88 55%, #ff99ac 100%)",
  유럽: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  북미: "linear-gradient(135deg, #43cea2 0%, #185a9d 100%)",
  남미: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)",
  아프리카: "linear-gradient(135deg, #f12711 0%, #f5af19 100%)",
  오세아니아: "linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)",
  중동: "linear-gradient(135deg, #c79081 0%, #dfa579 100%)",
};
const DEFAULT_GRADIENT = "linear-gradient(135deg, #2aa3f5 0%, #0563b0 100%)";

interface CoverPhotoProps {
  country?: string | null;
  continent?: string | null;
  /** 사진 아래쪽을 어둡게 깔아 흰 글씨를 올릴 수 있게 */
  scrim?: boolean;
  className?: string;
  /** 사진 확대 정도 (hover 줌 등은 부모에서 group으로 제어) */
  zoomOnHover?: boolean;
}

/**
 * 나라 대표 사진을 꽉 채워 까는 배경. 부모는 `relative overflow-hidden`이어야 한다.
 */
export default function CoverPhoto({
  country,
  continent,
  scrim = true,
  className = "",
  zoomOnHover = false,
}: CoverPhotoProps) {
  const bg = getCountryBackground(country);
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 select-none ${className}`}>
      {bg ? (
        // eslint-disable-next-line @next/next/no-img-element -- 로컬 정적 자산
        <img
          src={bg.image}
          alt=""
          loading="lazy"
          draggable={false}
          className={`h-full w-full object-cover transition-transform duration-700 ease-out ${
            zoomOnHover ? "group-hover:scale-105" : ""
          }`}
        />
      ) : (
        <div
          className="h-full w-full"
          style={{ background: CONTINENT_GRADIENTS[continent ?? ""] ?? DEFAULT_GRADIENT }}
        />
      )}
      {scrim && <div className="photo-scrim absolute inset-0" />}
    </div>
  );
}

export function hasCountryPhoto(country?: string | null) {
  return getCountryBackground(country) !== null;
}
