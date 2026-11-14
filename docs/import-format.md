# JSON 일정 가져오기 형식 (version 1)

새 여행 화면의 **JSON으로 가져오기**, 또는 여행 화면 ⋯ 메뉴의 **JSON으로 일정 바꾸기**에 붙여 넣는 형식이다.
검사는 `src/lib/tripImport.ts`, 저장은 `POST /api/trips/import` 가 한다.

## 예시

```json
{
  "version": 1,
  "trip": {
    "title": "요나고·산인 2박 3일",
    "continent": "아시아",
    "country": "일본",
    "region": "요나고",
    "start_date": "2026-11-25",
    "end_date": "2026-11-27",
    "base_currency": "JPY"
  },
  "days": [
    {
      "day": 1,
      "area": "요나고·하나카이로",
      "stay": "東横INN 米子駅前",
      "places": [
        {
          "time": "14:50",
          "stay_min": 60,
          "category": "transport",
          "name": "米子鬼太郎空港",
          "lat": 35.49335,
          "lng": 133.24283,
          "memo": "에어서울 13:20→14:50. 15:50 연결버스 ¥640 현금",
          "move": { "method": "transit", "min": 45 }
        },
        {
          "time": "16:40",
          "stay_min": 75,
          "category": "stay",
          "name": "東横INN 米子駅前",
          "lat": 35.42276,
          "lng": 133.3354
        }
      ]
    }
  ],
  "checklist": ["타이헤이키 11/26 19:30 예약"]
}
```

## 필드

| 위치 | 필드 | 필수 | 규칙 |
|---|---|---|---|
| 맨 위 | `version` | | `1` |
| `trip` | `title` | 새 여행일 때 | 100자까지 |
| | `continent`, `country`, `region` | | 새 여행 만들기 화면과 같은 이름 (예: `아시아`, `일본`, `요나고`) |
| | `start_date`, `end_date` | | `YYYY-MM-DD`. 있으면 `day` 가 기간(일 수)을 넘을 수 없다 |
| | `base_currency` | | 세 글자 통화 코드. 새 여행에서 없으면 `KRW` |
| `days[]` | `day` | ✓ | 1~365, 겹치면 안 됨 |
| | `area` | | Day 구역 이름, 60자까지 |
| | `stay` | | 그날 밤 숙소. 같은 Day 의 `places[].name` 과 똑같이 쓴다. 없으면 그날 마지막 `category: "stay"` 장소 |
| | `places[]` | ✓ | 방문 순서대로 |
| `places[]` | `name` | ✓ | 200자까지 |
| | `lat`, `lng` | ✓ | 숫자 좌표 |
| | `time` | | 도착 시각 `HH:MM` |
| | `stay_min` | | 머무는 분 0~1440. 없으면 앱 기본 60분 |
| | `category` | | `attraction` `food` `cafe` `stay` `transport` `shopping` `nature` `culture` `etc` (없거나 모르면 `attraction`) |
| | `memo` | | 2000자까지 |
| | `link_url` | | `http(s)://` 주소 |
| | `move` | | 다음 장소까지 이동: `{ "method": walk·transit·taxi·rental-car·bike·plane·ferry, "min": 0~1440 }` |
| 맨 위 | `checklist` | | 준비물 이름 목록. 같은 이름은 한 번만, 바꾸기에서는 이미 있는 이름을 건너뛴다 |

## 이동 구간 규칙

- `move` 가 있으면 그 이동수단과 시간(`min`)을 쓴다. `min` 이 없으면 두 장소 시각의 틈으로 계산한다.
- `move` 가 없고 두 장소 모두 `time` 이 있으면: 틈 = 다음 `time` − (이번 `time` + `stay_min`), 거리 1.6km 미만이면 걷기, 아니면 대중교통.
- 시각이 겹치면(틈이 음수) 경고만 하고 0분으로 넣는다.
- 시각이 없으면 구간을 넣지 않고 앱이 경로를 계산한다.

## 바꾸기(⋯ 메뉴)에서 일어나는 일

- 그 여행의 장소·이동 구간·Day 구역·숙소 연결을 모두 지우고 JSON 내용으로 바꾼다. 장소에 달린 사진·댓글·투표도 함께 지워진다.
- 여행 이름·날짜·가계부·예약·Day 기록(날씨·기분·일기)은 그대로 둔다. `trip` 블록은 무시한다.
- 한 트랜잭션이라 오류가 나면 아무것도 바뀌지 않는다.
