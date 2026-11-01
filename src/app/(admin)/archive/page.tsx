import Archive from "@/features/archive/Archive";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("여행 기록 · Triplan") };
}

export default function ArchivePage() {
  return <Archive />;
}
