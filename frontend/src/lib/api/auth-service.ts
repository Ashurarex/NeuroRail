import { apiRequest } from "@/lib/api/client";
import type { LoginRequest, LoginResponse, SignUpRequest } from "@/lib/api/types";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false";

function normalizeRoleFromEmail(email: string): "user" | "admin" {
  return email.includes("admin") ? "admin" : "user";
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  if (USE_MOCK) {
    return {
      access_token: `mock-token-${Date.now()}`,
      token_type: "bearer",
      role: normalizeRoleFromEmail(payload.email),
    };
  }

  const result = await apiRequest<{ access_token: string; token_type: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    ...result,
    role: normalizeRoleFromEmail(payload.email),
  };
}

export async function signUp(payload: SignUpRequest): Promise<void> {
  if (USE_MOCK) {
    return;
  }

  await apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      is_admin: payload.role === "admin",
    }),
  });
}
