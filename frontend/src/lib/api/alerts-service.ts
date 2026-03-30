import { apiRequest } from "@/lib/api/client";
import type { AlertRecord } from "@/lib/api/types";

export async function fetchAlerts(): Promise<AlertRecord[]> {
  return apiRequest<AlertRecord[]>("/alerts", {
    method: "GET",
  });
}
