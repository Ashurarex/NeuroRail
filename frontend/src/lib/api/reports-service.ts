import { apiRequest } from "@/lib/api/client";
import type { ReportsSummary } from "@/lib/api/types";

export async function fetchReportsSummary(): Promise<ReportsSummary> {
    return apiRequest<ReportsSummary>("/reports/summary", {
        method: "GET",
    });
}
