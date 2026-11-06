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
  // 샘플 여행 보기 링크 (/v/<토큰>). 관리자가 보기 링크 하나를 골라 SAMPLE_TRIP_PATH 에 넣는다
  const sample = process.env.SAMPLE_TRIP_PATH;
  if (!member) return <Landing sampleHref={sample && /^\/v\/[\w-]+$/.test(sample) ? sample : null} />;
  return (
    <AppShell role="demo">
      <MemberHome username={member.username} />
    </AppShell>
  );
}
