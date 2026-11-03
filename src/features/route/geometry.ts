import { haversineKm, type LatLng } from "./directions.ts";

/** 인코딩된 폴리라인 → [lng, lat] 목록. 구글 형식은 정밀도 5, Valhalla 는 6 */
export function decodePolyline(encoded: string, precision: 5 | 6): [number, number][] {
  const factor = 10 ** precision;
  const out: [number, number][] = [];
  let i = 0;
  let lat = 0;
  let lng = 0;
  const next = () => {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(i++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < encoded.length) {
    lat += next();
    lng += next();
    out.push([lng / factor, lat / factor]);
  }
  return out;
}

/** 경로가 핀에서 떨어져 시작·끝나면(핀이 건물·공원 안) 핀까지 잇는 짧은 선. 0~2개 */
export function connectors(shape: [number, number][], from: LatLng, to: LatLng, minMeters = 25): [number, number][][] {
  if (shape.length === 0) return [];
  const out: [number, number][][] = [];
  const [sLng, sLat] = shape[0];
  const [eLng, eLat] = shape[shape.length - 1];
  if (haversineKm(from, { lat: sLat, lng: sLng }) * 1000 > minMeters) out.push([[from.lng, from.lat], [sLng, sLat]]);
  if (haversineKm({ lat: eLat, lng: eLng }, to) * 1000 > minMeters) out.push([[eLng, eLat], [to.lng, to.lat]]);
  return out;
}
