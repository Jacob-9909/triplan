import { shareImage } from "@/lib/og/share";

// 편집 링크 미리보기 이미지 (카카오톡·메신저 카드). 구현은 src/lib/og/share.tsx

export const alt = "Triplan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// D-day·제목이 바뀌므로 요청마다 그린다
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return shareImage(token, "edit");
}
