import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentActor, findTripByToken } from "@/lib/auth";
import { shareMetadata } from "@/lib/og/share";
import SharedTrip from "@/features/trip/SharedTrip";

/** 카카오톡 등에 붙였을 때 보이는 카드 (이미지는 같은 폴더의 opengraph-image) */
export async function generateMetadata({ params }: PageProps<"/t/[token]">): Promise<Metadata> {
  return shareMetadata((await params).token, "edit");
}

/** 편집 링크: 링크를 가진 동행자가 함께 일정을 편집 */
export default async function EditLinkPage({ params }: PageProps<"/t/[token]">) {
  const { token } = await params;
  const found = await findTripByToken(token);
  if (!found || found.access !== "edit") notFound();
  return <SharedTrip tripId={found.tripId} token={token} mode="edit" canCopy={(await currentActor()) !== null} />;
}
