// connection.ts
import { LOCAL_STORAGE_KEYS } from "@/src/constants/localStorageKeys";

// Configuration
const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://student-portal-wh5i.onrender.com/api";
// "https://studentportal-production-869d.up.railway.app/api";

// Types
interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean>;
  skipAuthRefresh?: boolean; // Flag to prevent infinite refresh loops
}

interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  message?: string;
}

class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// Token Management
const TOKEN_KEY = LOCAL_STORAGE_KEYS.AUTH_TOKEN;
const REFRESH_TOKEN_KEY = LOCAL_STORAGE_KEYS.REFRESH_TOKEN;

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });

  failedQueue = [];
};

// Helper to build query string
const buildQueryString = (params: Record<string, unknown>): string => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.append(key, String(value));
    }
  });
  return query.toString();
};

// Refresh token function
const refreshAuthToken = async (): Promise<string> => {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new ApiError("No refresh token available", 401);
  }

  try {
    const response = await fetch(`${BASE_URL}/auth/refresh/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new ApiError("Failed to refresh token", response.status);
    }

    const data = (await response.json()) as { access?: string };

    // Store the new access token
    if (data.access) {
      setAuthToken(data.access);
      return data.access;
    }

    throw new ApiError("No access token in refresh response", 500);
  } catch (error) {
    // Clear tokens on refresh failure
    clearAuthTokens();

    // Redirect to login (if in browser)
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }

    throw error;
  }
};

// Core request handler
const request = async <T = unknown>(
  endpoint: string,
  config: RequestConfig = {},
): Promise<ApiResponse<T>> => {
  const { params, headers, skipAuthRefresh, ...restConfig } = config;

  // Build URL with query params
  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const queryString = buildQueryString(params);
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Default headers with auth
  // Don't set Content-Type for FormData – the browser sets it with the correct boundary
  const isFormData =
    typeof FormData !== "undefined" && restConfig.body instanceof FormData;
  const defaultHeaders: HeadersInit = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...getAuthHeaders(),
    ...headers,
  };

  try {
    const response = await fetch(url, {
      ...restConfig,
      headers: defaultHeaders,
    });

    // Parse response
    let data: unknown;
    const contentType = response.headers.get("content-type");
    if (response.status === 204) {
      data = null;
    } else if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    const apiData =
      data && typeof data === "object" ? (data as { message?: string }) : {};

    // Handle 401 - Token expired
    if (response.status === 401 && !skipAuthRefresh) {
      if (isRefreshing) {
        // Wait for the token refresh to complete
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          // Retry the request with new token
          return request<T>(endpoint, { ...config, skipAuthRefresh: true });
        });
      }

      isRefreshing = true;

      try {
        // Refresh the token
        await refreshAuthToken();
        isRefreshing = false;
        processQueue();

        // Retry the original request with new token
        return request<T>(endpoint, { ...config, skipAuthRefresh: true });
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError);
        throw refreshError;
      }
    }

    // Handle other errors
    if (!response.ok) {
      throw new ApiError(
        apiData.message || `Request failed with status ${response.status}`,
        response.status,
        data,
      );
    }

    return {
      data: data as T,
      status: response.status,
      message: apiData.message,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : "An unknown error occurred",
      500,
    );
  }
};

// HTTP Methods
export const api = {
  get: <T = unknown>(endpoint: string, config?: RequestConfig) =>
    request<T>(endpoint, { ...config, method: "GET" }),

  post: <T = unknown>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig,
  ) =>
    request<T>(endpoint, {
      ...config,
      method: "POST",
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
    }),

  put: <T = unknown>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig,
  ) =>
    request<T>(endpoint, {
      ...config,
      method: "PUT",
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
    }),

  delete: <T = unknown>(endpoint: string, config?: RequestConfig) =>
    request<T>(endpoint, { ...config, method: "DELETE" }),
};

// Token Management Functions
export const setAuthToken = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

export const setRefreshToken = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }
};

export const setTokens = (accessToken: string, refreshToken: string) => {
  setAuthToken(accessToken);
  setRefreshToken(refreshToken);
};

export const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
};

export const getRefreshToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return null;
};

export const clearAuthTokens = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

// Backward compatibility
export const clearAuthToken = clearAuthTokens;

// Helper to get auth headers
export const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

// Manual refresh function (can be called from components)
export const manualRefreshToken = async (): Promise<boolean> => {
  try {
    await refreshAuthToken();
    return true;
  } catch (error) {
    console.error("Manual token refresh failed:", error);
    return false;
  }
};

export { ApiError };
export default api;
