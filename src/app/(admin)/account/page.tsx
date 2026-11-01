import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import Account from "@/features/account/Account";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("내 계정 · Triplan") };
}

/** 사용 회원 전용. 관리자 비밀번호는 서버 설정(ADMIN_PASSWORD)이라 여기서 바꾸지 않는다 */
export default async function AccountPage() {
  const me = await currentUser();
  if (!me) redirect("/");
  return <Account username={me.username} />;
}
