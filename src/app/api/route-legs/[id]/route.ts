import { patchChild } from "@/lib/crud";

const ALLOWED = ["method", "duration_min", "distance_km", "cost", "method_chosen", "duration_manual"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return patchChild(request, "route_legs", (await params).id, ALLOWED);
}
