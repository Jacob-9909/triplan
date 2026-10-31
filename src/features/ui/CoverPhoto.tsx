import { getCountryBackground } from "@/data/countryBackgrounds";
import { findCityBackground, getCityBackground } from "@/data/cityBackgrounds";

/** 사진이 없는 나라용 대륙별 그라디언트 */
const CONTINENT_GRADIENTS: Record<string, string> = {
  아시아: "linear-gradient(160deg, #e8553d 0%, #8c2f1f 100%)",
  유럽: "linear-gradient(160deg, #2f5d8a 0%, #14233b 100%)",
  북미: "linear-gradient(160deg, #0d6b63 0%, #14233b 100%)",
  남미: "linear-gradient(160deg, #e9a23b 0%, #a8331c 100%)",
  아프리카: "linear-gradient(160deg, #c26a2c 0%, #5a2a14 100%)",
  오세아니아: "linear-gradient(160deg, #1f8a85 0%, #0e3b54 100%)",
  중동: "linear-gradient(160deg, #b7791f 0%, #5c3b14 100%)",
};
/** trips.continent 는 영어 id 로 저장된다 */
const CONTINENT_IDS: Record<string, string> = {
  asia: "아시아",
  europe: "유럽",
  "north-america": "북미",
  "south-america": "남미",
  africa: "아프리카",
  oceania: "오세아니아",
  "middle-east": "중동",
};
const DEFAULT_GRADIENT = "linear-gradient(160deg, #24365a 0%, #14233b 100%)";

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
}: CoverPhotoProps) {
  const image = getCityBackground(city) ?? findCityBackground(title) ?? getCountryBackground(country)?.image ?? null;
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
        <div
          className="h-full w-full"
          style={{
            background:
              CONTINENT_GRADIENTS[CONTINENT_IDS[continent ?? ""] ?? continent ?? ""] ?? DEFAULT_GRADIENT,
          }}
        />
      )}
      {scrim && <div className="photo-scrim absolute inset-0" />}
    </div>
  );
}

export function hasCountryPhoto(country?: string | null) {
  return getCountryBackground(country) !== null;
}
