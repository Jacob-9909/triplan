/** 한국어 → 영어 (hours: 영업시간) */
const en: Record<string, string> = {
  "영업시간": "Opening hours",
  "휴무일": "Closed that day",
  "영업시간 밖 · {hours}": "Outside opening hours · {hours}",
  "OpenStreetMap에서 찾기": "Find on OpenStreetMap",
  "OpenStreetMap에서 가져왔어요 — 일정표에서 휴무일·영업시간 밖이면 알려 줘요":
    "Taken from OpenStreetMap — the timetable will warn you if a visit falls on a closed day or outside opening hours",
  "일정표에서 휴무일·영업시간 밖이면 알려 줘요": "The timetable will warn you if a visit falls on a closed day or outside opening hours",
  "형식을 읽지 못했어요 — 경고 없이 메모로만 보여요": "Couldn't read this format — it's shown as a note only, without warnings",
  "OpenStreetMap에 영업시간 정보가 없어요": "OpenStreetMap has no opening hours for this place",
  "영업시간 정보가 없어요": "No opening hours",
  "영업시간을 찾지 못했어요.": "Couldn't look up the opening hours.",
  "OpenStreetMap에서 영업시간을 가져오지 못했어요.": "Couldn't reach OpenStreetMap for opening hours.",
};

export default en;
