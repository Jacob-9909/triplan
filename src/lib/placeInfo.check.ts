// 장소 정보 자체 점검: node src/lib/placeInfo.check.ts
import assert from "node:assert/strict";
import { addressFrom, infoFromTags, nominatimUrl } from "./placeInfo.ts";

// 검색 주소: 이름, 상자(서,북,동,남), 상자 밖은 안 찾음, 결과 1개
const u = new URL(nominatimUrl(" 센소지 ", 35.7148, 139.7967, "ko"));
assert.equal(u.searchParams.get("q"), "센소지");
assert.equal(u.searchParams.get("bounded"), "1");
assert.equal(u.searchParams.get("extratags"), "1");
assert.equal(u.searchParams.get("accept-language"), "ko");
const [w, n, e, s] = u.searchParams.get("viewbox")!.split(",").map(Number);
assert.ok(w < 139.7967 && 139.7967 < e && s < 35.7148 && 35.7148 < n);

// 주소: 이름·나라·우편번호를 빼고 한국어는 큰 단위부터, 번지(2-3-1)는 남긴다
const display = "센소지, 2-3-1, 아사쿠사, 다이토구, 도쿄도, 111-0032, 일본";
assert.equal(addressFrom(display, "ko"), "도쿄도 다이토구 아사쿠사 2-3-1");
assert.equal(addressFrom("Senso-ji, 2-3-1, Asakusa, Taito, Tokyo, 111-0032, Japan", "en"), "2-3-1, Asakusa, Taito, Tokyo");
assert.equal(addressFrom("경복궁, 사직로 161, 종로구, 서울, 03045, 대한민국", "ko"), "서울 종로구 사직로 161");
assert.equal(addressFrom("이름, 나라", "ko"), null);
assert.equal(addressFrom(undefined, "ko"), null);

// 태그 → 정보. http(s) 아닌 웹사이트는 버린다
assert.deepEqual(infoFromTags({ opening_hours: "Mo-Su 06:00-17:00", "contact:phone": "+81 3-3842-0181", website: "www.senso-ji.jp" }), {
  hours: "Mo-Su 06:00-17:00",
  phone: "+81 3-3842-0181",
  website: null,
  address: null,
});
assert.equal(infoFromTags({ "addr:full": "台東区浅草2-3-1" }).address, "台東区浅草2-3-1");
console.log("placeInfo ok");
