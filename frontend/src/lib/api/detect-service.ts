/**
 * NeuroRail – Detect API service
 * Calls POST /detect and GET /detect/status.
 */
import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BBox = { x: number; y: number; w: number; h: number };

export type DetectionItem = {
  label: string;
  confidence: number;
  bbox: BBox;
};

export type DetectResponse = {
  status: "ok";
  detections: DetectionItem[];
  confidence: number;
  alert_id: string;
  alert_level: "high" | "medium" | "low";
  alert_flag: boolean;
  model_type: string;
  timestamp: string;
};

export type ModelStatusResponse = {
  model_ready: boolean;
  model_type: string;
  model_path: string;
  alert_threshold: number;
};

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Upload an image blob and run ML inference.
 */
export async function runDetect(imageBlob: Blob, filename = "frame.jpg"): Promise<DetectResponse> {
  const token = getAuthToken();
  const form = new FormData();
  form.append("file", imageBlob, filename);

  return apiRequest<DetectResponse>("/detect", {
    method: "POST",
    body: form,
    isFormData: true,
    token,
  });
}

/**
 * Check whether the ML model is loaded on the server.
 */
export async function fetchModelStatus(): Promise<ModelStatusResponse> {
  return apiRequest<ModelStatusResponse>("/detect/status", { method: "GET" });
}
