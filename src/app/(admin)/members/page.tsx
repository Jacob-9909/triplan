import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import Members from "@/features/members/Members";

export const metadata = { title: "회원 관리 · Triplan" };

export default async function MembersPage() {
  if (!(await isAdmin())) redirect("/");
  return <Members />;
}
