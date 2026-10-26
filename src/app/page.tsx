import { isAdmin } from "@/lib/auth";
import AppShell from "@/features/shell/AppShell";
import Dashboard from "@/features/home/Dashboard";
import Landing from "@/features/home/Landing";

/** 관리자면 대시보드, 아니면 소개 화면 */
export default async function HomePage() {
  if (!(await isAdmin())) return <Landing />;
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}
