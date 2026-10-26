# Triplan

[English](README.md) | **한국어**

가고 싶은 곳에서 시작하는 여행 플래너입니다. 언젠가 가 보고 싶은 곳을 세계지도에 모아 두고, 마음이 정해지면 여행으로 바꿔 지도 위에서 하루씩 계획하고, 가계부와 준비물까지 챙긴 뒤 링크 하나로 동행자와 함께 편집합니다.

- 데모: https://triplan-beryl.vercel.app

## 주요 기능

| 기능 | 설명 |
|---|---|
| 가고 싶은 곳 | 나라·도시를 우선순위·메모·태그와 함께 저장하고 세계지도에 핀으로 표시. 버튼 하나로 여행으로 전환 |
| Day별 일정 | 장소 검색(국내 카카오, 해외 OSM Photon)이나 지도·장소 아이콘 클릭으로 핀을 꽂고, 끌어서 순서를 바꾸고, 구간마다 이동수단·비용을 정해 하루 합계를 확인 |
| 장소 상세 | 장소마다 사진(브라우저에서 줄여서 업로드)·링크·메모 첨부 |
| 가계부 | 현지 통화로 기록하면 원화로 자동 환산, Day별·분류별 요약 |
| 준비물·예약 | 템플릿이 있는 체크리스트, 항공·숙소·티켓 예약 기록과 D-day 표시 |
| 공유 링크 | 여행마다 동행자용 **편집 링크**와 가족·친구용 **보기 링크**. 회원가입 없음. 보기 링크에서는 예약번호를 숨김 |
| 여행 앱 UI | 사진 중심 카드, 모바일 하단 탭바, 바텀시트, 화면·목록 모션, D-day 카운트업, 홈 화면에 설치(PWA) |

## 접근 방식

회원 계정이 없습니다. 관리자 비밀번호 하나로 전체를 보호하고, 여행마다 무작위 토큰 두 개를 둡니다.

| 대상 | 방법 | 할 수 있는 일 |
|---|---|---|
| 관리자 | `ADMIN_PASSWORD`로 로그인 (HMAC 서명 쿠키) | 전부: 여행, 위시리스트, 공유 링크, 삭제 |
| 편집 링크 `/t/<token>` | 링크로 접속 | 그 여행 하나의 핀·일정·가계부·준비물·예약 편집 |
| 보기 링크 `/v/<token>` | 링크로 접속 | 그 여행 하나 보기. 예약번호와 예약 링크는 API에서 제거 |

링크는 언제든 새로 발급할 수 있고, 그러면 이전 링크는 바로 막힙니다. 모든 API가 서버에서 권한을 검사합니다([`src/lib/auth.ts`](src/lib/auth.ts)).

## 기술 스택

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, framer-motion
- Supabase Postgres (`pg`로 연결, 테이블은 `triplan` 스키마)
- MapLibre + OpenFreeMap Liberty 지도 (식당·카페·명소·역 아이콘, OSM에 한국어 이름이 있으면 한국어 표시, 실패 시 Carto, 토큰이 있으면 Mapbox), dnd-kit, date-fns

## 시작하기

### 1. 데이터베이스 (Supabase)

1. Supabase 프로젝트를 만듭니다.
2. [`supabase/migrations/`](supabase/migrations)의 파일을 순서대로 적용합니다. `supabase db push`를 쓰거나 SQL 편집기에 붙여 넣으면 됩니다.
3. 대시보드 Connect에서 **Transaction pooler** 연결 문자열(포트 6543)을 복사합니다.

테이블은 Supabase Data API에 노출되지 않는 `triplan` 스키마에 있고, 이중 안전장치로 RLS도 켜져 있습니다. DB에는 Next.js 서버만 접근합니다.

로컬 개발에는 아무 Postgres나 써도 됩니다.

```bash
docker run -d --name triplan-pg -e POSTGRES_PASSWORD=triplan -e POSTGRES_DB=triplan -p 5433:5432 postgres:16-alpine
for f in supabase/migrations/*.sql; do docker exec -i triplan-pg psql -U postgres -d triplan < "$f"; done
```

### 2. 앱 실행

```bash
npm install
cp .env.example .env.local   # DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET
npm run dev
```

http://localhost:3000 에서 `ADMIN_PASSWORD`로 로그인합니다. 선택 항목(Mapbox, 카카오, 환율)은 [`.env.example`](.env.example)을 참고하세요.

### 3. 배포 (Vercel)

Vercel 프로젝트에 `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`을 설정하고 배포합니다.

## 프로젝트 구조

```
src/
├── app/
│   ├── (admin)/         관리자 전용: 가고 싶은 곳, 새 여행, 여행 화면
│   ├── t/[token]/       편집 링크
│   ├── v/[token]/       보기 링크
│   ├── login/           관리자 로그인
│   └── api/             라우트 핸들러 (모두 권한 검사)
├── features/
│   ├── home/            소개 화면, 대시보드
│   ├── wishlist/        위시리스트 지도·카드·입력
│   ├── trip/            여행 화면, 공유 패널, 여행 카드
│   ├── map/             지도 엔진 래퍼, 핀, 장소 검색
│   ├── route/           Day 탭, 일정, 타임라인
│   ├── expenses/        가계부
│   ├── prep/            체크리스트, 예약 기록
│   ├── shell/           앱 틀 (상단 바, 하단 탭바)
│   └── ui/              커버 사진, 바텀시트, 카운트업, 날짜 도우미
├── lib/                 DB 풀, 인증, API 클라이언트, 타입
└── data/                나라·도시, 배경 사진 매핑
supabase/migrations/     DB 스키마
```

## 출처

나라 배경 사진은 Wikimedia Commons 이미지입니다. [`public/backgrounds/CREDITS.md`](public/backgrounds/CREDITS.md)를 참고하세요.
