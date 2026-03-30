import { apiRequest } from "@/lib/api/client";
import type { LoginRequest, LoginResponse, SignUpRequest } from "@/lib/api/types";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  if (USE_MOCK) {
    return {
      access_token: `mock-token-${Date.now()}`,
      token_type: "bearer",
      role: payload.role,
    };
  }

  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
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
      phone: payload.phone,
      is_admin: payload.role === "admin",
    }),
  });
}
