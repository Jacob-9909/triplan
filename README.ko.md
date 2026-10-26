# Triplan

[English](README.md) | **한국어**

가고 싶은 곳에서 시작하는 여행 플래너입니다. 언젠가 가 보고 싶은 곳을 세계지도에 모아 두고, 마음이 정해지면 여행으로 바꿔 지도 위에서 하루씩 계획하고, 타임테이블·가계부·준비물까지 챙긴 뒤 링크 하나로 동행자와 함께 편집합니다.

- 데모: https://triplan.161-33-134-252.sslip.io

![여행 화면: Day 탭, 번호 핀과 방향 화살표가 있는 경로 지도, 하루 타임테이블](docs/screenshot.jpg)

## 주요 기능

| 기능 | 설명 |
|---|---|
| 가고 싶은 곳 | 나라·도시를 우선순위·메모·태그와 함께 저장하고 세계지도에 핀으로 표시. 버튼 하나로 여행으로 전환 |
| Day별 지도 | 장소 검색(국내 카카오, 해외 OSM Photon)이나 지도·장소 아이콘 클릭으로 핀을 꽂음. 지도는 고른 도시에서 시작하고, 경로는 방향 화살표가 붙은 선으로 표시 |
| 방문 순서 | 장소가 화살표로 이어진 칩(① → ② → ③)으로 보임. 끌어서 순서를 바꾸고, 누르면 상세가 열림 |
| 장소 상세 | 장소마다 아이콘(관광지·음식점·카페·쇼핑·문화재·자연·숙소·교통)과 핀 색 지정, 사진·링크·메모 첨부 |
| 타임테이블 | 장소별 도착 시각·머무는 시간, 구간별 이동수단·소요 시간을 정하면 하루 일정이 도착·출발 시각이 붙은 타임테이블로 정리 |
| 한국어 지도 | OpenStreetMap에 한국어 이름이 없는 라벨(가게·시설·길 이름)을 지도를 움직일 때 한국어로 번역해 표시. 지도에서 고른 장소는 현지 이름 옆에 한국어가 붙음: `東京タワー (도쿄 타워)` |
| 가계부 | 현지 통화로 기록하면 원화로 자동 환산, Day별·분류별 요약. 쉼표가 붙는 금액 입력과 빠른 더하기 버튼 |
| 준비물·예약 | 템플릿이 있는 체크리스트, 항공·숙소·티켓 예약 기록과 D-day 표시 |
| 공유 링크 | 여행마다 동행자용 **편집 링크**와 가족·친구용 **보기 링크**. 회원가입 없음. 보기 링크에서는 예약번호를 숨김 |
| 여행 앱 UI | 사진 중심 카드, 모바일 하단 탭바, 바텀시트, 화면·목록 모션, D-day 카운트업, 홈 화면에 설치(PWA) |

## 접근 방식

회원가입은 없습니다. 관리자 비밀번호 하나로 전체를 보호하고, 여행마다 무작위 토큰 두 개를 두며, 관리자가 체험 계정을 만들 수 있습니다.

| 대상 | 방법 | 할 수 있는 일 |
|---|---|---|
| 관리자 | `ADMIN_PASSWORD`로 로그인 (HMAC 서명 쿠키) | 전부: 여행, 위시리스트, 공유 링크, 삭제 |
| 편집 링크 `/t/<token>` | 링크로 접속 | 그 여행 하나의 핀·일정·가계부·준비물·예약 편집 |
| 보기 링크 `/v/<token>` | 링크로 접속 | 그 여행 하나 보기. 예약번호와 예약 링크는 API에서 제거 |
| 체험 계정 | 관리자가 회원 관리 화면에서 만든 아이디·비밀번호로 로그인 | 공유 창에서 '체험 회원에게 공개'를 켠 여행만 보기. 장소 검색·번역·환율은 못 씀 |

링크는 언제든 새로 발급할 수 있고, 그러면 이전 링크는 바로 막힙니다. 모든 API가 서버에서 권한을 검사합니다([`src/lib/auth.ts`](src/lib/auth.ts)).

## 한국어 지도 라벨 동작 방식

1. 지도 이동이 멈추면 화면에 보이는 라벨 중 `name:ko`가 없는 것을 모읍니다.
2. 묶어서 `/api/translate`로 보냅니다. 원문 언어는 가나 유무나 여행 나라로 추정합니다.
3. 서버는 공용 캐시 테이블(`triplan.name_translations`)에서 먼저 찾고, 처음 보는 이름만 무료 [MyMemory](https://mymemory.translated.net/) API에 묻습니다.
4. 받은 번역을 지도 라벨 식에 넣습니다. 한 번 본 지역은 다음부터 바로 한국어로 보입니다.

무료 한도는 하루 약 5,000자이고, `MYMEMORY_EMAIL`을 넣으면 50,000자입니다. 한도가 차면 라벨은 현지어로 남습니다. 기계 번역이라 이름이 어색할 수 있고, 장소 이름은 직접 고칠 수 있습니다.

## 기술 스택

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, framer-motion
- PostgreSQL 17 (`pg`로 연결, 테이블은 `triplan` 스키마), Oracle Cloud VM 자체 호스팅
- MapLibre + OpenFreeMap Liberty 지도 (식당·카페·명소·역 아이콘, 실패 시 Carto, 토큰이 있으면 Mapbox), dnd-kit, date-fns
- MyMemory 번역 API (무료, 키 불필요)

## 시작하기

### 1. 데이터베이스

Postgres 13 이상에 [`supabase/migrations/`](supabase/migrations)의 파일을 순서대로 적용합니다. 앱이 접속하는 계정이 `triplan` 테이블의 소유자여야 합니다. RLS가 정책 없이 켜져 있어서 소유자만 읽을 수 있습니다. DB에는 Next.js 서버만 접근합니다.

로컬 개발에는 아무 Postgres나 써도 됩니다.

```bash
docker run -d --name triplan-pg -e POSTGRES_PASSWORD=triplan -e POSTGRES_DB=triplan -p 5433:5432 postgres:16-alpine
for f in supabase/migrations/*.sql; do docker exec -i triplan-pg psql -U postgres -d triplan < "$f"; done
```

### 2. 앱 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

http://localhost:3000 에서 `ADMIN_PASSWORD`로 로그인합니다.

| 변수 | 필수 | 용도 |
|---|---|---|
| `DATABASE_URL` | 예 | Postgres 연결 문자열 |
| `ADMIN_PASSWORD` | 예 | 관리자 로그인 |
| `SESSION_SECRET` | 예 | 로그인 쿠키 서명 (32자 이상 무작위 문자열) |
| `KAKAO_REST_KEY` | 아니요 | 국내 장소 검색 |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | 아니요 | MapLibre 대신 Mapbox 사용 |
| `MYMEMORY_EMAIL` | 아니요 | 무료 번역 한도 늘리기 |
| `EXCHANGE_RATE_API_KEY` | 아니요 | 환율 (없으면 무료 엔드포인트 사용) |

### 3. 배포 (Oracle Cloud VM)

앱과 DB가 같은 VM에서 돕니다. Postgres는 `127.0.0.1`에서만 받고, 앱 앞에서 Caddy가 TLS를 처리합니다.

| 구성 | 위치 |
|---|---|
| 앱 | systemd [`triplan.service`](deploy/triplan.service)가 standalone 빌드를 `node server.js`로 실행 (`127.0.0.1:8030`) |
| 비밀값 | VM의 `~/triplan/.env` (위 표와 같은 변수) |
| DB | 로컬 PostgreSQL 17, `postgres` DB의 `triplan` 스키마 (소유자 `triplan` 계정) |
| CI/CD | [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml): 모든 push와 PR에서 lint·build. `main`이면 VM에 SSH로 들어가 [`deploy/deploy.sh`](deploy/deploy.sh) 실행. 빌드 후 릴리스를 바꾸고 `/api/health`가 실패하면 되돌립니다 |

GitHub secrets: `VM_HOST`, `VM_SSH_KEY` (`authorized_keys`의 `command=`로 `deploy.sh`만 실행 가능한 키), `VM_KNOWN_HOSTS`.

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
│   ├── trip/            여행 화면, 장소 상세, 공유 패널
│   ├── map/             지도 엔진 래퍼, 핀, 경로 화살표, 한국어 라벨
│   ├── route/           Day 탭, 방문 순서 칩, 타임테이블
│   ├── expenses/        가계부
│   ├── prep/            체크리스트, 예약 기록
│   ├── shell/           앱 틀 (상단 바, 하단 탭바)
│   └── ui/              커버 사진, 바텀시트, 금액 입력, 날짜 도우미
├── lib/                 DB 풀, 인증, 번역, API 클라이언트, 타입
└── data/                나라·도시, 지도 중심 좌표, 배경 사진
supabase/migrations/     DB 스키마
```

## 출처

나라 배경 사진은 Wikimedia Commons 이미지입니다. [`public/backgrounds/CREDITS.md`](public/backgrounds/CREDITS.md)를 참고하세요. 지도 데이터 © OpenStreetMap 기여자, 타일 OpenFreeMap.
