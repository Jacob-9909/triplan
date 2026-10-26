import TripWorkspace from "@/features/trip/TripWorkspace";

export default async function TripPage({ params }: PageProps<"/trips/[tripId]">) {
  const { tripId } = await params;
  return <TripWorkspace tripId={tripId} mode="admin" />;
}
