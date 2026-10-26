import { getPool, jsonError } from "@/lib/db";

// 배포 스크립트가 DB 연결까지 확인하는 헬스체크
export async function GET() {
  try {
    await getPool().query("select 1");
    return Response.json({ ok: true });
  } catch {
    return jsonError("db unavailable", 503);
  }
}
