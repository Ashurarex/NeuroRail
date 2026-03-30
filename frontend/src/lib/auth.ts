export type AppRole = "user" | "admin";

export const AUTH_TOKEN_COOKIE = "nr_token";
export const AUTH_ROLE_COOKIE = "nr_role";

export function normalizeRole(role: string | null | undefined): AppRole {
  return role === "admin" ? "admin" : "user";
}

export function setAuthSession(
  token: string,
  role: AppRole,
  remember: boolean,
): void {
  const maxAge = remember ? "; max-age=2592000" : "";
  document.cookie = `${AUTH_TOKEN_COOKIE}=${token}; path=/; SameSite=Lax${maxAge}`;
  document.cookie = `${AUTH_ROLE_COOKIE}=${role}; path=/; SameSite=Lax${maxAge}`;
}

export function clearAuthSession(): void {
  document.cookie = `${AUTH_TOKEN_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie = `${AUTH_ROLE_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const prefix = `${name}=`;
  const item = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix));

  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

export function getAuthToken(): string | null {
  return getCookieValue(AUTH_TOKEN_COOKIE);
}
