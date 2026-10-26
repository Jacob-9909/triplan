import { deleteChild, patchChild } from "@/lib/crud";

const ALLOWED = [
  "point_id", "day_number", "category", "title",
  "amount_local", "currency_code", "exchange_rate_krw", "amount_krw", "spent_at",
] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return patchChild(request, "expenses", (await params).id, ALLOWED);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return deleteChild(request, "expenses", (await params).id);
}
