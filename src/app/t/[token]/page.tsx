import { notFound } from "next/navigation";
import { findTripByToken } from "@/lib/auth";
import SharedTrip from "@/features/trip/SharedTrip";

/** 편집 링크: 링크를 가진 동행자가 함께 일정을 편집 */
export default async function EditLinkPage({ params }: PageProps<"/t/[token]">) {
  const { token } = await params;
  const found = await findTripByToken(token);
  if (!found || found.access !== "edit") notFound();
  return <SharedTrip tripId={found.tripId} token={token} mode="edit" />;
}
