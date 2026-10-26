import { patchChild } from "@/lib/crud";

const ALLOWED = ["method", "duration_min", "distance_km", "cost"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return patchChild(request, "route_legs", (await params).id, ALLOWED);
}
