import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import AppShell from "@/features/shell/AppShell";

/** 관리자 전용 영역: 로그인하지 않았으면 로그인 화면으로 */
export default async function AdminLayout({ children }: LayoutProps<"/">) {
  if (!(await isAdmin())) redirect("/login");
  return <AppShell>{children}</AppShell>;
}
