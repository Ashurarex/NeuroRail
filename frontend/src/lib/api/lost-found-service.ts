import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth";
import type { DetectResponse } from "@/lib/api/types";

export async function submitLostItemImage(file: File): Promise<DetectResponse> {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please login again before submitting a lost item.");
  }

  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<DetectResponse>("/detect", {
    method: "POST",
    body: formData,
    token,
    isFormData: true,
  });
}
