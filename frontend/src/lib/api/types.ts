export type Role = "user" | "admin";

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  role: Role;
};

export type SignUpRequest = {
  email: string;
  password: string;
  phone: string;
  role: Role;
};

export type AdminUserRecord = {
  id: string;
  email: string;
  role: Role;
  status: string;
  last_login: string | null;
};

export type AdminLiveSummary = {
  total_alerts: number;
  recent_alerts: number;
  total_detections: number;
  total_predictions: number;
};

export type ReportsSummary = {
  total: number;
  high: number;
  medium: number;
  low: number;
};

export type AlertRecord = {
  id: string;
  object_type: string;
  confidence: number;
  bbox: Record<string, number>;
  alert_level: string;
  image_url: string;
  created_at: string;
};

export type DetectResponse = {
  message: string;
  alert: AlertRecord;
};

export type LostFoundStatus = "pending" | "matched" | "verified" | "closed";

export type LostFoundMatchStatus = "pending" | "verified" | "rejected";

export type LostFoundCase = {
  id: string;
  status: LostFoundStatus;
  location: string | null;
  image_url: string | null;
  object_type: string | null;
  description: string | null;
  color: string | null;
  size: string | null;
  reported_at: string | null;
  user_id: string | null;
  alert_id: string | null;
  created_at: string;
};

export type MatchDetection = {
  id: string;
  label: string;
  confidence: number;
  bbox: Record<string, number> | null;
  camera_id: string | null;
  location: string | null;
  detected_at: string | null;
  image_url: string | null;
  snapshot_url: string | null;
  attributes: Record<string, string | number> | null;
  frame_width: number | null;
  frame_height: number | null;
};

export type LostFoundMatch = {
  id: string;
  case_id: string;
  detection: MatchDetection;
  confidence: number;
  image_similarity: number;
  label_match: number;
  metadata_score: number;
  status: LostFoundMatchStatus;
  created_at: string;
};
