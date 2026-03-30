import { apiRequest } from "@/lib/api/client";
import type { AlertRecord } from "@/lib/api/types";

export type AlertFilters = {
  severity?: string;
  objectType?: string;
};

export async function fetchAlerts(filters?: AlertFilters): Promise<AlertRecord[]> {
  const params = new URLSearchParams();

  if (filters?.severity) {
    params.set("severity", filters.severity);
  }

  if (filters?.objectType) {
    params.set("object_type", filters.objectType);
  }

  const query = params.toString();
  const path = query ? `/alerts?${query}` : "/alerts";

  return apiRequest<AlertRecord[]>(path, {
    method: "GET",
  });
}
