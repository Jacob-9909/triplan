# Triplan

**English** | [한국어](README.ko.md)

A travel planner that starts from the places you dream about. Save places you want to visit someday on a world map, turn one into a trip when you are ready, plan it day by day on a map with a budget and packing list, and share it with one link so companions can edit along with you.

- Demo: https://triplan-beryl.vercel.app

## Features

| Feature | Description |
|---|---|
| Wishlist | Save countries and cities you want to visit with a priority, memo, and tags. Pins on a world map. Turn any of them into a trip in one tap |
| Day-by-day plan | Search places (Kakao for Korea, OSM Photon worldwide) or tap the map to drop pins, drag to reorder, and see the route and travel time per day |
| Budget | Record expenses in local currency with automatic KRW conversion and per-day and per-category summaries |
| Packing and bookings | Checklist with templates, plus flight, hotel, and ticket records with D-day badges |
| Share links | Each trip has an **edit link** for companions and a **view link** for family and friends. No sign-up. Booking codes are hidden on view links |
| Travel-app UI | Photo-first cards, bottom tab bar on mobile, bottom sheets, page and list motion, D-day count-up, installable as a PWA |

## Access Model

There are no user accounts. One admin password protects everything, and each trip carries two random tokens.

| Who | How | Can do |
|---|---|---|
| Admin | Logs in with `ADMIN_PASSWORD` (HMAC-signed cookie) | Everything: trips, wishlist, share links, delete |
| Edit link `/t/<token>` | Opens the link | Edit that one trip's pins, plan, budget, checklist, bookings |
| View link `/v/<token>` | Opens the link | Read that one trip. Booking codes and links are removed by the API |

Links can be regenerated at any time, which immediately disables the old one. Every API route checks access on the server ([`src/lib/auth.ts`](src/lib/auth.ts)).

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, framer-motion
- Supabase Postgres via `pg` (tables in the `triplan` schema)
- MapLibre with Carto basemaps (or Mapbox with a token), dnd-kit, date-fns

## Getting Started

### 1. Database (Supabase)

1. Create a Supabase project.
2. Apply the files in [`supabase/migrations/`](supabase/migrations) in order, either with `supabase db push` or by pasting them into the SQL editor.
3. Copy the **Transaction pooler** connection string (port 6543) from Connect in the dashboard.

The tables live in the `triplan` schema, which the Supabase Data API does not expose, and RLS is enabled as a second guard. Only the Next.js server talks to the database.

For local development you can use any Postgres instead:

```bash
docker run -d --name triplan-pg -e POSTGRES_PASSWORD=triplan -e POSTGRES_DB=triplan -p 5433:5432 postgres:16-alpine
for f in supabase/migrations/*.sql; do docker exec -i triplan-pg psql -U postgres -d triplan < "$f"; done
```

### 2. App

```bash
npm install
cp .env.example .env.local   # DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET
npm run dev
```

Open http://localhost:3000 and log in with `ADMIN_PASSWORD`. See [`.env.example`](.env.example) for optional keys (Mapbox, Kakao, exchange rate).

### 3. Deploy (Vercel)

Set `DATABASE_URL`, `ADMIN_PASSWORD`, and `SESSION_SECRET` in the Vercel project, then deploy.

## Project Structure

```
src/
├── app/
│   ├── (admin)/         Admin-only pages: wishlist, new trip, trip workspace
│   ├── t/[token]/       Edit link
│   ├── v/[token]/       View link
│   ├── login/           Admin login
│   └── api/             Route handlers (all access-checked)
├── features/
│   ├── home/            Landing and dashboard
│   ├── wishlist/        Wishlist map, cards, form
│   ├── trip/            Trip workspace, share panel, trip card
│   ├── map/             Map engine wrapper, pins, place search
│   ├── route/           Day tabs, itinerary, timeline
│   ├── expenses/        Budget
│   ├── prep/            Checklist and booking records
│   ├── shell/           App shell (top bar, bottom tab bar)
│   └── ui/              Cover photo, bottom sheet, count-up, date helpers
├── lib/                 DB pool, auth, API client, types
└── data/                Countries, cities, background photo map
supabase/migrations/     Database schema
```

## Credits

Country photos are from Wikimedia Commons. See [`public/backgrounds/CREDITS.md`](public/backgrounds/CREDITS.md).
