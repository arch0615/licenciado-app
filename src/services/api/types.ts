import type { ApiService } from "@/config/env";

export type { ApiService };

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryValue = string | number | boolean | null | undefined;

export type ApiRequest = {
  method: HttpMethod;
  /** Path under the API base URL, e.g. `/v1/auth/me`. */
  path: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** Sent as `Idempotency-Key` for critical mutations (checkout, submissions). */
  idempotencyKey?: string;
  /** `false` for public endpoints (registration, invitation validation). Default: true. */
  authenticated?: boolean;
  signal?: AbortSignal;
  /**
   * Which ACVEL backend serves the path: `auth` (EXPO_PUBLIC_AUTH_API_URL), `business`
   * (EXPO_PUBLIC_BUSINESS_API_URL, the default) or `rateio` (EXPO_PUBLIC_RATEIO_API_URL).
   */
  service?: ApiService;
  /** Raw (Blob) bodies only: sent as this Content-Type instead of JSON (file uploads through the API). */
  contentType?: string;
  /** `text` returns the raw response body (e.g. textual receipts) instead of parsing JSON. Default `json`. */
  responseType?: "json" | "text";
};

/**
 * Transport abstraction: the HTTP implementation talks to licenciado-api,
 * the mock implementation answers from in-memory handlers (EXPO_PUBLIC_USE_MOCKS=true).
 * Feature code only ever sees `ApiClient`.
 */
export interface ApiTransport {
  readonly kind: "http" | "mock";
  request<T>(request: ApiRequest): Promise<T>;
}

export type ApiClient = {
  readonly kind: ApiTransport["kind"];
  request<T>(request: ApiRequest): Promise<T>;
  get<T>(path: string, options?: Omit<ApiRequest, "method" | "path" | "body">): Promise<T>;
  post<T>(path: string, body?: unknown, options?: Omit<ApiRequest, "method" | "path" | "body">): Promise<T>;
  put<T>(path: string, body?: unknown, options?: Omit<ApiRequest, "method" | "path" | "body">): Promise<T>;
  patch<T>(path: string, body?: unknown, options?: Omit<ApiRequest, "method" | "path" | "body">): Promise<T>;
  delete<T>(path: string, options?: Omit<ApiRequest, "method" | "path" | "body">): Promise<T>;
};
