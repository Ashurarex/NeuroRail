import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth";
import type {
  LostFoundCase,
  LostFoundMatch,
  LostFoundMatchStatus,
  LostFoundStatus,
} from "@/lib/api/types";

export type LostFoundCreatePayload = {
  file: File;
  location?: string;
  objectType?: string;
  description?: string;
  color?: string;
  size?: string;
  reportedAt?: string;
};

export async function createLostFoundCase(
  payload: LostFoundCreatePayload,
): Promise<LostFoundCase> {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please login again before submitting a lost item.");
  }

  const formData = new FormData();
  formData.append("file", payload.file);
  if (payload.location?.trim()) {
    formData.append("location", payload.location.trim());
  }
  if (payload.objectType?.trim()) {
    formData.append("object_type", payload.objectType.trim());
  }
  if (payload.description?.trim()) {
    formData.append("description", payload.description.trim());
  }
  if (payload.color?.trim()) {
    formData.append("color", payload.color.trim());
  }
  if (payload.size?.trim()) {
    formData.append("size", payload.size.trim());
  }
  if (payload.reportedAt?.trim()) {
    formData.append("reported_at", payload.reportedAt.trim());
  }

  try {
    console.log("Submitting lost & found case:", {
      file: payload.file.name,
      location: payload.location,
    });
    const result = await apiRequest<LostFoundCase>("/lost-item", {
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

export async function fetchLostFoundMatches(caseId: string): Promise<LostFoundMatch[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Please login again as admin.");
  }

  return apiRequest<LostFoundMatch[]>(`/matches/${caseId}`, {
    method: "GET",
    token,
  });
}

export async function updateLostFoundMatchStatus(
  matchId: string,
  status: LostFoundMatchStatus,
  matchNotes?: string,
): Promise<LostFoundMatch> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Please login again as admin.");
  }

  return apiRequest<LostFoundMatch>(`/matches/match/${matchId}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify({ status, match_notes: matchNotes ?? null }),
    },
  );
}
