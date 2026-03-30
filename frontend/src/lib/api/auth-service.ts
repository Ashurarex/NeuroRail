import { apiRequest } from "@/lib/api/client";
import type { LoginRequest, LoginResponse, SignUpRequest } from "@/lib/api/types";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  if (USE_MOCK) {
    // Mock auth: try to call a special mock endpoint first, fallback to creating demo token
    try {
      // Attempt to use mock-login endpoint if it exists
      const mockResponse = await fetch("http://localhost:8000/mock-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
        }),
      });

      if (mockResponse.ok) {
        return (await mockResponse.json()) as LoginResponse;
      }
    } catch {
      // Fallback to direct backend login if mock endpoint doesn't exist
    }

    // Try actual backend login as fallback
    try {
      return await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch {
      // If backend login also fails, use demo token
      const isAdmin = payload.email.toLowerCase().includes("admin");
      return {
        access_token: `demo-${isAdmin ? "admin" : "user"}-token-${Date.now()}`,
        token_type: "bearer",
        role: isAdmin ? "admin" : "user",
      };
    }
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
