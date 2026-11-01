import NewTrip from "@/features/destination/NewTrip";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("새 여행 · Triplan") };
}

/** ?wish=<id>: 가고 싶은 곳에서 바로 여행 만들기 */
export default async function NewTripPage({ searchParams }: PageProps<"/trips/new">) {
  const { wish } = await searchParams;
  return <NewTrip wishId={typeof wish === "string" ? wish : null} />;
}
