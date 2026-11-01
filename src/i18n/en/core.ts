/** 한국어 → 영어 (공통: 언어·테마 전환) */
const en: Record<string, string> = {
  "언어 바꾸기": "Change language",
  "테마 바꾸기": "Change theme",
  "시스템 테마": "System theme",
  "라이트 모드": "Light mode",
  "다크 모드": "Dark mode",
  "기본 통화": "Home currency",
  "금액을 이 통화로 대략 바꿔 보여 줘요": "Amounts are shown roughly converted to this currency",

  // 여행 날짜 (features/ui/dates.ts)
  "여행 중 · Day {n}": "On the trip · Day {n}",
  "다녀온 여행": "Past trip",
  "날짜 미정": "No dates yet",
  "yyyy. M. d (E)": "MMM d, yyyy (EEE)",
  "yyyy. M. d": "MMM d, yyyy",
  "M. d": "MMM d",
  "당일치기": "Day trip",
  "{n}박 {d}일": "{n} nights, {d} days",

  // 시간 (features/route/schedule.ts)
  "{m}분": "{m} min",
  "{h}시간 {m}분": "{h} h {m} min",
  "{h}시간": "{h} h",
};

export default en;
