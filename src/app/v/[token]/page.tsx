import { notFound } from "next/navigation";
import { findTripByToken } from "@/lib/auth";
import SharedTrip from "@/features/trip/SharedTrip";

/** 보기 링크: 일정만 볼 수 있는 읽기 전용 화면 */
export default async function ViewLinkPage({ params }: PageProps<"/v/[token]">) {
  const { token } = await params;
  const found = await findTripByToken(token);
  if (!found || found.access !== "view") notFound();
  return <SharedTrip tripId={found.tripId} token={token} mode="view" />;
}
