import { redirect } from "next/navigation";
import { currentMember, isAdmin } from "@/lib/auth";
import LoginForm from "./LoginForm";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("로그인 · Triplan") };
}

export default async function LoginPage() {
  if ((await isAdmin()) || (await currentMember())) redirect("/");
  return <LoginForm />;
}
