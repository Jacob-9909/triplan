import { redirect } from "next/navigation";
import { currentActor } from "@/lib/auth";
import AppShell from "@/features/shell/AppShell";

/** 로그인한 관리자·사용 회원 영역 (회원 관리는 페이지에서 관리자만 다시 확인한다) */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  return <AppShell role={actor.kind}>{children}</AppShell>;
}
