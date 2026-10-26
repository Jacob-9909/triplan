import { redirect } from "next/navigation";
import { currentMember, isAdmin } from "@/lib/auth";
import AppShell from "@/features/shell/AppShell";
import TripWorkspace from "@/features/trip/TripWorkspace";

/** 체험 회원용 여행 화면: 보기 전용 (공개 여부는 API가 다시 확인한다) */
export default async function DemoTripPage({ params }: PageProps<"/demo/[tripId]">) {
  const { tripId } = await params;
  if (await isAdmin()) redirect(`/trips/${tripId}`);
  if (!(await currentMember())) redirect("/login");
  return (
    <AppShell member>
      <TripWorkspace tripId={tripId} mode="view" />
    </AppShell>
  );
}
