import type { TravelDoc } from "@/lib/types";

/** 그날 일정 위에 띄울 예약과 그날 기준 상태 */
export interface DayDoc {
  doc: TravelDoc;
  /** 숙소: 체크인·숙박·체크아웃. 그 밖에는 시작일·이용 중·종료일 */
  when: "start" | "during" | "end";
}

/** 여행 내내 걸쳐 있는 서류라 하루 일정에는 안 띄운다 */
export const WHOLE_TRIP: TravelDoc["type"][] = ["passport", "visa", "insurance"];

/** date("yyyy-MM-dd")에 걸린 예약. 날짜는 모두 "yyyy-MM-dd" 라 문자열 비교로 충분하다 */
export function docsOnDay(docs: TravelDoc[], date: string): DayDoc[] {
  const out: DayDoc[] = [];
  for (const doc of docs) {
    if (!doc.starts_at || WHOLE_TRIP.includes(doc.type)) continue;
    const start = doc.starts_at.slice(0, 10);
    const end = doc.ends_at?.slice(0, 10) ?? start;
    if (date < start || date > end) continue;
    out.push({ doc, when: date === start ? "start" : date === end ? "end" : "during" });
  }
  // 체크아웃 → 그날 시작하는 예약 → 이어지는 숙박 순서 (하루 흐름대로)
  const rank = { end: 0, start: 1, during: 2 };
  return out.sort((a, b) => rank[a.when] - rank[b.when]);
}
