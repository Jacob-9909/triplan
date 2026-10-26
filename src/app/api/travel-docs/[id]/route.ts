import { deleteChild, patchChild } from "@/lib/crud";

const ALLOWED = ["type", "title", "provider", "confirmation_code", "url", "starts_at", "ends_at"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return patchChild(request, "travel_docs", (await params).id, ALLOWED);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return deleteChild(request, "travel_docs", (await params).id);
}
