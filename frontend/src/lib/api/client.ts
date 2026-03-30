const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

type ApiRequestOptions = RequestInit & {
  token?: string | null;
  isFormData?: boolean;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type ErrorPayload = {
  detail?: string;
  message?: string;
  error?: string;
};

async function readErrorMessage(response: Response): Promise<string> {
  const rawText = await response.text();
  if (!rawText) {
    return "Request failed";
  }

  try {
    const data = JSON.parse(rawText) as ErrorPayload;
    return data.detail || data.message || data.error || rawText;
  } catch {
    return rawText;
  }
}

export async function apiRequest<T>(
  path: string,
  options?: ApiRequestOptions,
): Promise<T> {
  const headers = new Headers(options?.headers ?? {});

  if (!options?.isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options?.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError("Backend unreachable. Please ensure the API server is running.", 0);
  }

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export async function pingBackend(): Promise<{ status?: string; service?: string }> {
  return apiRequest("/health", { method: "GET" });
}
