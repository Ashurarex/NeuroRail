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
