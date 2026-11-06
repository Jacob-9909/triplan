// 화면 도장(TripStamp)과 서버 회고 카드가 같은 모양·색을 쓰도록 여기 둔다

/** 지도 핀과 같은 계열의 잉크색 (흰 배경 대비 4.5:1 이상) */
export const INKS = ["#cc4126", "#0d6b63", "#2f5d8a", "#6d5bd0", "#a16207", "#c2417a"];

/** 여행 id 로 정해지는 값: 같은 여행은 늘 같은 도장 */
export function stampSeed(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** 도장 잉크색·모양(원/사각)·기울기(도) */
export function stampLook(id: string) {
  const seed = stampSeed(id);
  return {
    seed,
    ink: INKS[seed % INKS.length],
    round: (seed >> 3) % 2 === 0,
    tilt: ((seed >> 5) % 19) - 9,
  };
}
