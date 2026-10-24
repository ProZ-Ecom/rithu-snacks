import { ApiResponse } from "./api-response";

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "";
  }
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    ""
  );
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly errors?: string[];

  constructor(message: string, status: number, errors?: string[]) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.errors = errors;
  }
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  _isRetry?: boolean;
}

// Shared promise for deduplicating concurrent token refresh operations
let refreshPromise: Promise<boolean> | null = null;

export async function performSilentRefresh(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return Boolean(data && data.success);
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Auth endpoints that should not trigger automatic 401 retry
const AUTH_BYPASS_ENDPOINTS = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/refresh",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/resend-forgot-password-otp",
  "/api/auth/verify-otp",
  "/api/auth/reset-password",
  "/api/auth/send-email-otp",
  "/api/auth/resend-register-otp",
  "/api/auth/verify-email-otp",
];

async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { params, _isRetry, ...fetchOptions } = options;
  const baseUrl = getBaseUrl();

  let url = `${baseUrl}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const isFormData = fetchOptions.body instanceof FormData;
  const defaultHeaders: Record<string, string> = isFormData
    ? {}
    : { "Content-Type": "application/json" };

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      credentials: "include", // Transmits Server-Side HttpOnly Cookies automatically
      headers: {
        ...defaultHeaders,
        ...(fetchOptions.headers as Record<string, string>),
      },
    });
  } catch {
    throw new ApiClientError(
      "Network error. Please check your connection and try again.",
      0
    );
  }

  // If 401 Unauthorized occurs on an authenticated endpoint and we haven't retried yet:
  const isAuthEndpoint = AUTH_BYPASS_ENDPOINTS.some((ep) =>
    endpoint.startsWith(ep)
  );

  if (response.status === 401 && !isAuthEndpoint) {
    let refreshed = false;
    if (!_isRetry) {
      refreshed = await performSilentRefresh();
      if (refreshed) {
        // Retry the original request with the fresh token cookie
        return fetchApi<T>(endpoint, {
          ...options,
          _isRetry: true,
        });
      }
    }

    // Refresh didn't help — for GET query requests, redirect to login so the user isn't stuck on an empty state.
    // For mutations (POST, PUT, PATCH, DELETE), let it throw ApiClientError so the UI catches it with toast error instead of reloading the page.
    const isMutation = Boolean(fetchOptions.method && fetchOptions.method !== "GET");
    if (!refreshed && !isMutation && typeof window !== "undefined") {
      const isAdminEndpoint = endpoint.startsWith("/api/admin/");
      const loginPath = isAdminEndpoint ? "/admin/login" : "/login";
      if (!window.location.pathname.startsWith(loginPath)) {
        const callbackUrl = encodeURIComponent(
          window.location.pathname + window.location.search
        );
        window.location.href = isAdminEndpoint
          ? loginPath
          : `${loginPath}?callbackUrl=${callbackUrl}`;
      }
    }
  }

  let data: ApiResponse<T>;
  try {
    data = await response.json();
  } catch {
    throw new ApiClientError(
      "Invalid response from server.",
      response.status
    );
  }

  if (!response.ok || !data.success) {
    throw new ApiClientError(
      data.message || "Something went wrong",
      response.status,
      data.errors
    );
  }

  return data;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: FetchOptions) =>
    fetchApi<T>(endpoint, { method: "GET", ...options }),

  post: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    fetchApi<T>(endpoint, {
      method: "POST",
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    fetchApi<T>(endpoint, {
      method: "PUT",
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    fetchApi<T>(endpoint, {
      method: "PATCH",
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T>(endpoint: string, options?: FetchOptions) =>
    fetchApi<T>(endpoint, { method: "DELETE", ...options }),
};

