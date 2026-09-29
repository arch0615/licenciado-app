import type { ApiClient, ApiTransport } from "./types";

export function createApiClient(transport: ApiTransport): ApiClient {
  return {
    kind: transport.kind,
    request: (request) => transport.request(request),
    get: (path, options) => transport.request({ ...options, method: "GET", path }),
    post: (path, body, options) => transport.request({ ...options, method: "POST", path, body }),
    put: (path, body, options) => transport.request({ ...options, method: "PUT", path, body }),
    patch: (path, body, options) => transport.request({ ...options, method: "PATCH", path, body }),
    delete: (path, options) => transport.request({ ...options, method: "DELETE", path })
  };
}

/** Random key for Idempotency-Key headers (reuse the same key when retrying the same action). */
export function newIdempotencyKey(prefix = "app"): string {
  const random = Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}-${random}`.slice(0, 64);
}
