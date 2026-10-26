import { redirect } from "next/navigation";
import { currentMember, isAdmin } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const metadata = { title: "로그인 · Triplan" };

export default async function LoginPage() {
  if ((await isAdmin()) || (await currentMember())) redirect("/");
  return <LoginForm />;
}
