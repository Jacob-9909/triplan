import { deleteChild, patchChild } from "@/lib/crud";

const ALLOWED = ["label", "is_checked", "sort_order", "category"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return patchChild(request, "checklist_items", (await params).id, ALLOWED);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return deleteChild(request, "checklist_items", (await params).id);
}
