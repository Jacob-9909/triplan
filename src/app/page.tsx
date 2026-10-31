import { currentActor, currentMember } from "@/lib/auth";
import AppShell from "@/features/shell/AppShell";
import Dashboard from "@/features/home/Dashboard";
import Landing from "@/features/home/Landing";
import MemberHome from "@/features/home/MemberHome";

/** 관리자·사용 회원이면 대시보드, 체험 회원이면 공개 여행 목록, 아니면 소개 화면 */
export default async function HomePage() {
  const actor = await currentActor();
  if (actor) {
    return (
      <AppShell role={actor.kind}>
        <Dashboard />
      </AppShell>
    );
  }
  const member = await currentMember();
  if (!member) return <Landing />;
  return (
    <AppShell role="demo">
      <MemberHome username={member.username} />
    </AppShell>
  );
}
