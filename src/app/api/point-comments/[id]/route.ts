import { deleteChild } from "@/lib/crud";

/** 댓글 지우기: 편집 권한이면 누구나 (공유 링크는 계정이 없어 쓴 사람을 가릴 수 없다) */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return deleteChild(request, "point_comments", (await params).id);
}
