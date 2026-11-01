import Wishlist from "@/features/wishlist/Wishlist";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("가고 싶은 곳 · Triplan") };
}

export default function WishlistPage() {
  return <Wishlist />;
}
