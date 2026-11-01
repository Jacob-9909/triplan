import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import Members from "@/features/members/Members";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("회원 관리 · Triplan") };
}

export default async function MembersPage() {
  if (!(await isAdmin())) redirect("/");
  return <Members />;
}
