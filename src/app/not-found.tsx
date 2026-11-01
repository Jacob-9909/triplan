import Link from "next/link";
import { Compass } from "lucide-react";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
        <Compass size={30} />
      </div>
      <h1 className="mt-5 text-2xl font-extrabold tracking-tight">{t("길을 잃었어요")}</h1>
      <p className="mt-2 max-w-xs text-sm text-foreground/65">
        {t("페이지가 없거나 공유 링크가 바뀌었어요. 링크를 보낸 사람에게 새 링크를 받아 주세요.")}
      </p>
      <Link href="/" className="btn btn-ghost mt-6 px-5 py-2.5 text-sm">
        {t("처음으로")}
      </Link>
    </main>
  );
}
