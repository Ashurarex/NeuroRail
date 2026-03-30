import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth";
import type { LostFoundCase, LostFoundStatus } from "@/lib/api/types";

export async function createLostFoundCase(
  file: File,
  location: string,
): Promise<LostFoundCase> {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please login again before submitting a lost item.");
  }

  const formData = new FormData();
  formData.append("file", file);
  if (location.trim()) {
    formData.append("location", location.trim());
  }

  try {
    console.log("Submitting lost & found case:", { file: file.name, location });
    const result = await apiRequest<LostFoundCase>("/lost-found", {
      method: "POST",
      body: formData,
      token,
      isFormData: true,
    });
    console.log("Lost & found case created successfully:", result);
    return result;
  } catch (error) {
    console.error("Failed to create lost and found case:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to submit case: ${error.message}`);
    }
    throw error;
  }
}

export async function fetchMyLostFoundCases(): Promise<LostFoundCase[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Please login again to view your cases.");
  }

  return apiRequest<LostFoundCase[]>("/lost-found/mine", {
    method: "GET",
    token,
  });
}

export async function fetchAdminLostFoundCases(
  status?: LostFoundStatus,
): Promise<LostFoundCase[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Please login again as admin.");
  }

  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }
  const path = params.toString() ? `/lost-found/admin?${params.toString()}` : "/lost-found/admin";

  return apiRequest<LostFoundCase[]>(path, {
    method: "GET",
    token,
  });
}

export async function updateLostFoundStatus(
  caseId: string,
  status: LostFoundStatus,
): Promise<LostFoundCase> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Please login again as admin.");
  }

  return apiRequest<LostFoundCase>(`/lost-found/admin/${caseId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ status }),
  });
}
