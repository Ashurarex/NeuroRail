export type Role = "user" | "admin";

export type LoginRequest = {
  email: string;
  password: string;
  role: Role;
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
