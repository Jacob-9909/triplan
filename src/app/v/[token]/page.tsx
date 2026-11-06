import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentActor, findTripByToken } from "@/lib/auth";
import { shareMetadata } from "@/lib/og/share";
import SharedTrip from "@/features/trip/SharedTrip";

/** 카카오톡 등에 붙였을 때 보이는 카드 (이미지는 같은 폴더의 opengraph-image) */
export async function generateMetadata({ params }: PageProps<"/v/[token]">): Promise<Metadata> {
  return shareMetadata((await params).token, "view");
}

/** 보기 링크: 일정만 볼 수 있는 읽기 전용 화면 */
export default async function ViewLinkPage({ params }: PageProps<"/v/[token]">) {
  const { token } = await params;
  const found = await findTripByToken(token);
  if (!found || found.access !== "view") notFound();
  return <SharedTrip tripId={found.tripId} token={token} mode="view" canCopy={(await currentActor()) !== null} />;
}
