import { getAuthToken } from "@/lib/auth";
import { apiRequest } from "@/lib/api/client";
import type { AdminLiveSummary, AdminUserRecord } from "@/lib/api/types";

export async function fetchAdminUsers(): Promise<AdminUserRecord[]> {
    const token = getAuthToken();
    if (!token) {
        throw new Error("Please login again as admin.");
    }

    return apiRequest<AdminUserRecord[]>("/admin/users", {
        method: "GET",
        token,
    });
}

export async function fetchAdminLiveSummary(): Promise<AdminLiveSummary> {
    const token = getAuthToken();
    if (!token) {
        throw new Error("Please login again as admin.");
    }

    return apiRequest<AdminLiveSummary>("/admin/live-summary", {
        method: "GET",
        token,
    });
}
