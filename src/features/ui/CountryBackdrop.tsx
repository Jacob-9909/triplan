import { getCountryBackground } from "@/data/countryBackgrounds";

/** 이미지가 없는 국가를 위한 대륙별 기본 그라디언트 폴백 */
const CONTINENT_GRADIENTS: Record<string, string> = {
  asia: "linear-gradient(135deg, #ffe3ec 0%, #ffd6a5 100%)",
  europe: "linear-gradient(135deg, #dbe7ff 0%, #f3d1f4 100%)",
  "north-america": "linear-gradient(135deg, #d4f1f9 0%, #ffe5b4 100%)",
  "south-america": "linear-gradient(135deg, #d8f3dc 0%, #ffe8d6 100%)",
  africa: "linear-gradient(135deg, #ffe8c2 0%, #ffc9a3 100%)",
  oceania: "linear-gradient(135deg, #cdf5fd 0%, #e2fbfc 100%)",
  "middle-east": "linear-gradient(135deg, #f6e0b5 0%, #ffdab9 100%)",
};

interface CountryBackdropProps {
  country?: string | null;
  continent?: string;
}

/**
 * 국가 대표 이미지를 뒷배경으로 깔아주는 장식용 컴포넌트.
 * 부모 요소에 `relative isolate`(필요 시 overflow-hidden)를 붙여 사용하세요.
 */
export default function CountryBackdrop({ country, continent }: CountryBackdropProps) {
  const bg = getCountryBackground(country);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 select-none overflow-hidden rounded-[inherit]"
    >
      {bg ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 정적 자산이라 일반 img 사용 */}
          <img
            src={bg.image}
            alt=""
            loading="lazy"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/30 to-transparent" />
          <div
            className="absolute inset-0 opacity-[0.18] mix-blend-multiply"
            style={{ backgroundColor: bg.themeColor }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              CONTINENT_GRADIENTS[continent ?? ""] ?? CONTINENT_GRADIENTS.asia,
          }}
        />
      )}
    </div>
  );
}
