import { ApiError, apiErrorFromResponse, networkError } from "./errors";
import type { ApiRequest, ApiService, ApiTransport, QueryValue } from "./types";

export type TokenProvider = {
  /** Current Firebase ID token (null when signed out). `forceRefresh` asks the SDK for a new one. */
  getIdToken(forceRefresh?: boolean): Promise<string | null>;
};

export type HttpTransportOptions = {
  /** Base URL per ACVEL backend service (empty string = not configured). */
  baseUrls: Record<ApiService, string>;
  timeoutMs: number;
  tokens: TokenProvider;
  /** Called when a request is still 401 after one forced token refresh (session invalid → sign out). */
  onUnauthorized?: () => void;
  clientHeaders?: Record<string, string>;
  fetchImpl?: typeof fetch;
  /** Extra attempts for GET requests that fail at the network level or with 502/503/504. Default 1. */
  getRetries?: number;
  /** Delay before a retry, in ms. Default 600. */
  retryDelayMs?: number;
};

const RETRYABLE_STATUS = new Set([502, 503, 504]);

function buildUrl(baseUrl: string, path: string, query?: Record<string, QueryValue>): string {
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${url}?${search}` : url;
}

const isFormData = (body: unknown): body is FormData => typeof FormData !== "undefined" && body instanceof FormData;
const isBlob = (body: unknown): body is Blob => typeof Blob !== "undefined" && body instanceof Blob;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * HTTP transport for the ACVEL backends:
 * - routes each request to the base URL of its `service` (auth · business · rateio)
 * - `Authorization: Bearer <Firebase ID token>` (never cookies)
 * - one forced token refresh + retry on 401, then `onUnauthorized` (sign out)
 * - timeout → ApiError TIMEOUT, network failure → ApiError NETWORK_ERROR
 * - GET only: bounded retry on network failure / 502 / 503 / 504 (mutations are never replayed)
 * - JSON bodies, multipart for FormData, raw bytes for Blob (uploads)
 */
export function createHttpTransport(options: HttpTransportOptions): ApiTransport {
  const fetchImpl = options.fetchImpl ?? fetch;
  const getRetries = options.getRetries ?? 1;
  const retryDelayMs = options.retryDelayMs ?? 600;

  async function send(baseUrl: string, request: ApiRequest, token: string | null): Promise<Response> {
    const headers: Record<string, string> = { Accept: "application/json", ...options.clientHeaders };
    const multipart = isFormData(request.body);
    const raw = isBlob(request.body);
    if (raw) headers["Content-Type"] = request.contentType ?? "application/octet-stream";
    else if (request.body !== undefined && !multipart) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    if (request.idempotencyKey) headers["Idempotency-Key"] = request.idempotencyKey;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    const onExternalAbort = () => controller.abort();
    request.signal?.addEventListener("abort", onExternalAbort);
    try {
      return await fetchImpl(buildUrl(baseUrl, request.path, request.query), {
        method: request.method,
        headers,
        body:
          request.body === undefined
            ? undefined
            : multipart || raw
              ? (request.body as FormData | Blob)
              : JSON.stringify(request.body),
        signal: controller.signal
      });
    } catch (error) {
      if (request.signal?.aborted) throw error;
      throw networkError(controller.signal.aborted ? "TIMEOUT" : "NETWORK_ERROR");
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener("abort", onExternalAbort);
    }
  }

  async function sendWithRetry(baseUrl: string, request: ApiRequest, token: string | null): Promise<Response> {
    const attempts = request.method === "GET" ? getRetries + 1 : 1;
    for (let attempt = 1; ; attempt++) {
      try {
        const response = await send(baseUrl, request, token);
        if (attempt < attempts && RETRYABLE_STATUS.has(response.status)) {
          await wait(retryDelayMs * attempt);
          continue;
        }
        return response;
      } catch (error) {
        const retryable = error instanceof ApiError && error.isNetwork && !request.signal?.aborted;
        if (!retryable || attempt >= attempts) throw error;
        await wait(retryDelayMs * attempt);
      }
    }
  }

  async function parse<T>(response: Response, responseType: ApiRequest["responseType"] = "json"): Promise<T> {
    const requestId = response.headers.get("x-request-id");
    const text = response.status === 204 ? "" : await response.text();
    if (response.ok && responseType === "text") return text as T;
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
    }
    if (!response.ok) throw apiErrorFromResponse(response.status, body, requestId);
    return body as T;
  }

  return {
    kind: "http",
    async request<T>(request: ApiRequest): Promise<T> {
      const baseUrl = options.baseUrls[request.service ?? "business"];
      if (!baseUrl) {
        throw new ApiError({
          status: 0,
          code: "API_NOT_CONFIGURED",
          message: "O aplicativo não está configurado para acessar o servidor."
        });
      }
      const authenticated = request.authenticated !== false;
      const token = authenticated ? await options.tokens.getIdToken(false) : null;
      if (authenticated && !token) {
        throw new ApiError({ status: 401, code: "MISSING_TOKEN", message: "Sua sessão expirou. Faça login novamente." });
      }

      let response = await sendWithRetry(baseUrl, request, token);
      if (response.status === 401 && authenticated) {
        const refreshed = await options.tokens.getIdToken(true);
        if (refreshed) response = await sendWithRetry(baseUrl, request, refreshed);
        if (response.status === 401) options.onUnauthorized?.();
      }
      return parse<T>(response, request.responseType);
    }
  };
}
