#!/usr/bin/env node
/**
 * 도시 대표 사진 받기 (Wikimedia Commons, 자유 라이선스만).
 * 도시마다 대표 명소의 영어 위키백과 문서 대표 이미지를 찾고, Commons 파일이면서
 * CC BY / CC BY-SA / CC0 / Public domain 일 때만 1600px 로 받아 1280px 로 줄여 저장한다.
 *
 *   node scripts/fetch-city-photos.mjs            # 없는 것만 받기
 *   node scripts/fetch-city-photos.mjs --force    # 다시 받기
 *
 * 결과: public/backgrounds/cities/<slug>.jpg, public/backgrounds/cities/credits.json
 * credits.json 으로 CREDITS.md 의 도시 표와 src/data/cityBackgrounds.ts 를 만든다 (--write).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

// [도시 이름(world.ts 와 같게), 파일 slug, 위키백과 문서]
const CITIES = [
  ["도쿄", "tokyo", "Tokyo_Tower"],
  ["오사카", "osaka", "Osaka_Castle"],
  ["교토", "kyoto", "Kinkaku-ji"],
  ["후쿠오카", "fukuoka", "Fukuoka_Tower"],
  ["삿포로", "sapporo", "Sapporo_TV_Tower"],
  ["오키나와", "okinawa", "Shuri_Castle"],
  ["서울", "seoul", "Bukchon_Hanok_Village"],
  ["부산", "busan", "Gamcheon_Culture_Village"],
  ["제주", "jeju", "Seongsan_Ilchulbong"],
  ["경주", "gyeongju", "Bulguksa"],
  ["베이징", "beijing", "Temple_of_Heaven"],
  ["상하이", "shanghai", "The_Bund"],
  ["홍콩", "hong-kong", "A_Symphony_of_Lights"],
  ["방콕", "bangkok", "Wat_Arun"],
  ["치앙마이", "chiang-mai", "Wat_Phra_That_Doi_Suthep"],
  ["푸켓", "phuket", "Patong_Beach"],
  ["하노이", "hanoi", "Hoàn_Kiếm_Lake"],
  ["호치민", "ho-chi-minh", "Saigon_Notre-Dame_Basilica"],
  ["다낭", "da-nang", "Golden_Bridge_(Vietnam)"],
  ["호이안", "hoi-an", "Japanese_Covered_Bridge"],
  ["할롱베이", "ha-long-bay", "Hạ_Long_Bay"],
  ["타이베이", "taipei", "Taipei"],
  ["지우펀", "jiufen", "Jiufen"],
  ["발리 쿠타", "bali-kuta", "Tanah_Lot"],
  ["쿠알라룸푸르", "kuala-lumpur", "Batu_Caves"],
  ["세부", "cebu", "Kawasan_Falls"],
  ["보라카이", "boracay", "Boracay"],
  ["파리", "paris", "Eiffel_Tower"],
  ["니스", "nice", "Promenade_des_Anglais"],
  ["로마", "rome", "Colosseum"],
  ["베네치아", "venice", "Grand_Canal_(Venice)"],
  ["피렌체", "florence", "Florence_Cathedral"],
  ["밀라노", "milan", "Milan_Cathedral"],
  ["바르셀로나", "barcelona", "Sagrada_Família"],
  ["마드리드", "madrid", "Royal_Palace_of_Madrid"],
  ["런던", "london", "Tower_Bridge"],
  ["에든버러", "edinburgh", "Edinburgh_Castle"],
  ["인터라켄", "interlaken", "Jungfrau"],
  ["루체른", "lucerne", "Chapel_Bridge"],
  ["암스테르담", "amsterdam", "Canals_of_Amsterdam"],
  ["빈", "vienna", "Schönbrunn_Palace"],
  ["잘츠부르크", "salzburg", "Hohensalzburg_Fortress"],
  ["할슈타트", "hallstatt", "Hallstatt"],
  ["프라하", "prague", "Prague_Castle"],
  ["리스본", "lisbon", "Belém_Tower"],
  ["포르투", "porto", "Dom_Luís_I_Bridge"],
  ["아테네", "athens", "Parthenon"],
  ["부다페스트", "budapest", "Hungarian_Parliament_Building"],
  ["뉴욕", "new-york", "Times_Square"],
  ["샌프란시스코", "san-francisco", "Golden_Gate_Bridge"],
  ["로스앤젤레스", "los-angeles", "Hollywood_Sign"],
  ["라스베이거스", "las-vegas", "Las_Vegas_Strip"],
  ["호놀룰루", "honolulu", "Waikiki"],
  ["밴쿠버", "vancouver", "Canada_Place"],
  ["칸쿤", "cancun", "Cancún"],
  ["시드니", "sydney", "Sydney_Opera_House"],
  ["멜버른", "melbourne", "Flinders_Street_railway_station"],
  ["퀸스타운", "queenstown", "Lake_Wakatipu"],
  ["두바이", "dubai", "Burj_Khalifa"],
  ["이스탄불", "istanbul", "Hagia_Sophia"],
  ["카파도키아", "cappadocia", "Cappadocia"],
  ["마라케시", "marrakesh", "Jemaa_el-Fnaa"],
  ["카이로", "cairo", "Giza_pyramid_complex"],
  ["케이프타운", "cape-town", "Table_Mountain"],
];

const UA = "TriplanPhotoFetcher/1.0 (https://github.com/Jacob-9909/triplan)";
const OUT = "public/backgrounds/cities";
const FREE = /^(CC BY(-SA)? [\d.]+|CC0|Public domain|PD|cc-by|cc-by-sa)/i;
const force = process.argv.includes("--force");
const write = process.argv.includes("--write");

const strip = (html = "") => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
async function json(url) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (r.ok) return r.json();
    await new Promise((s) => setTimeout(s, 1500 * (i + 1)));
  }
  throw new Error(`fetch failed ${url}`);
}

mkdirSync(OUT, { recursive: true });
const creditsPath = `${OUT}/credits.json`;
const credits = existsSync(creditsPath) ? JSON.parse(readFileSync(creditsPath, "utf8")) : {};

if (!write) {
  for (const [city, slug, article] of CITIES) {
    const file = `${OUT}/${slug}.jpg`;
    if (!force && existsSync(file) && credits[city]) continue;
    try {
      const page = await json(
        `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=name&redirects=1&titles=${encodeURIComponent(article)}`
      );
      const name = Object.values(page.query.pages)[0]?.pageimage;
      if (!name) throw new Error("no page image");
      // 로고·지도·도식은 배경으로 쓸 수 없다
      if (/\.svg$|logo|(^|[_ (-])(map|plan)([_ .)-]|$)|diagram|flag|coat_of_arms/i.test(name)) throw new Error(`not a photo: ${name}`);
      // Commons 에 있는 파일만 (위키백과 로컬 파일은 비자유 이미지일 수 있다)
      const info = await json(
        `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1600&titles=${encodeURIComponent("File:" + name)}`
      );
      const ii = Object.values(info.query.pages)[0]?.imageinfo?.[0];
      if (!ii) throw new Error(`not on Commons: ${name}`);
      const m = ii.extmetadata ?? {};
      const license = strip(m.LicenseShortName?.value);
      if (!FREE.test(license)) throw new Error(`license not allowed: ${license}`);
      const img = await fetch(ii.thumburl, { headers: { "User-Agent": UA } });
      if (!img.ok) throw new Error(`download ${img.status}`);
      writeFileSync(file, Buffer.from(await img.arrayBuffer()));
      // 1280px 이하, JPEG 품질 60 으로 줄인다 (macOS sips). 카드·헤더에는 충분하다
      execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "60", "-Z", "1280", file, "--out", file], {
        stdio: "ignore",
      });
      credits[city] = {
        slug,
        file: name,
        page: ii.descriptionurl,
        author: strip(m.Artist?.value).slice(0, 80) || "Unknown",
        license,
      };
      console.log("ok  ", city, name, license);
    } catch (err) {
      console.log("SKIP", city, article, err.message);
    }
    await new Promise((s) => setTimeout(s, 300));
  }
  writeFileSync(creditsPath, JSON.stringify(credits, null, 2) + "\n");
} else {
  // credits.json → src/data/cityBackgrounds.ts, CREDITS.md 도시 표
  const entries = CITIES.filter(([city]) => credits[city]);
  const ts = `/** 도시별 대표 사진 (scripts/fetch-city-photos.mjs 가 만든다). 없으면 나라 사진을 쓴다 */
const CITY_BACKGROUNDS: Record<string, string> = {
${entries.map(([city, slug]) => `  ${JSON.stringify(city)}: "/backgrounds/cities/${slug}.jpg",`).join("\n")}
};

export function getCityBackground(city?: string | null): string | null {
  if (!city) return null;
  return CITY_BACKGROUNDS[city.trim()] ?? null;
}

/** "교토 단풍"처럼 제목 안에 든 도시 이름으로 찾는다 (긴 이름부터 맞춘다) */
export function findCityBackground(text?: string | null): string | null {
  if (!text) return null;
  const names = Object.keys(CITY_BACKGROUNDS).sort((a, b) => b.length - a.length);
  const hit = names.find((n) => text.includes(n));
  return hit ? CITY_BACKGROUNDS[hit] : null;
}
`;
  writeFileSync("src/data/cityBackgrounds.ts", ts);
  const md = readFileSync("public/backgrounds/CREDITS.md", "utf8").split("\n## City photos")[0].trimEnd();
  const rows = entries.map(([city]) => {
    const c = credits[city];
    return `| cities/${c.slug}.jpg | [${c.file.replace(/_/g, " ").replace(/\.\w+$/, "")}](${c.page}) | ${c.author.replace(/\|/g, "/")} | ${c.license} |`;
  });
  writeFileSync(
    "public/backgrounds/CREDITS.md",
    `${md}\n\n## City photos\n\nCity photos come from Wikimedia Commons under free licenses, resized to 1280px.\n\n| File | Source | Author | License |\n|---|---|---|---|\n${rows.join("\n")}\n`
  );
  console.log(`wrote ${entries.length} cities`);
}
