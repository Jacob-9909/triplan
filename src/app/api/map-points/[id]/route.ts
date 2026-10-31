import { deleteChild, patchChild } from "@/lib/crud";

const ALLOWED = [
  "visit_order", "day_number", "name", "category", "memo", "lat", "lng",
  "link_url", "color", "start_time", "stay_min", "rating", "review",
] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return patchChild(request, "map_points", (await params).id, ALLOWED);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return deleteChild(request, "map_points", (await params).id);
}
