import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth";
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

export async function deleteAlert(alertId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Please login again as admin.");
  }

  await apiRequest(`/alerts/${alertId}`, {
    method: "DELETE",
    token,
  });
}

/**
 * Delete all provided alert IDs in parallel.
 * Uses Promise.allSettled so a single failure does not abort the rest.
 * Returns the count of successfully deleted alerts.
 */
export async function deleteAllAlerts(alertIds: string[]): Promise<number> {
  if (alertIds.length === 0) return 0;
  const results = await Promise.allSettled(alertIds.map((id) => deleteAlert(id)));
  return results.filter((r) => r.status === "fulfilled").length;
}

