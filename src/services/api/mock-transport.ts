import { ApiError } from "./errors";
import type { ApiRequest, ApiTransport, HttpMethod } from "./types";

export type MockContext = {
  request: ApiRequest;
  params: Record<string, string>;
};

export type MockHandler = (context: MockContext) => unknown;

export type MockRoute = {
  method: HttpMethod;
  /** Path pattern with `:params`, e.g. `/v1/clients/:id`. */
  path: string;
  handler: MockHandler;
};

function compile(pattern: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  const source = pattern
    .split("/")
    .map((segment) => {
      if (segment.startsWith(":")) {
        keys.push(segment.slice(1));
        return "([^/]+)";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { regex: new RegExp(`^${source}$`), keys };
}

/**
 * In-memory transport used when EXPO_PUBLIC_USE_MOCKS=true.
 * Handlers return data or throw `ApiError` (to simulate backend errors).
 * Unknown routes fail with 404 so missing mocks are obvious during development.
 */
export function createMockTransport(routes: MockRoute[], options: { latencyMs?: number } = {}): ApiTransport {
  const compiled = routes.map((route) => ({ ...route, ...compile(route.path) }));
  const latency = options.latencyMs ?? 350;

  return {
    kind: "mock",
    async request<T>(request: ApiRequest): Promise<T> {
      if (latency > 0) await new Promise((resolve) => setTimeout(resolve, latency));
      const path = request.path.split("?")[0] ?? request.path;
      for (const route of compiled) {
        if (route.method !== request.method) continue;
        const match = route.regex.exec(path);
        if (!match) continue;
        const params = Object.fromEntries(route.keys.map((key, index) => [key, decodeURIComponent(match[index + 1] ?? "")]));
        // Serialise like a real response: keeps mock state immutable from the caller's perspective.
        const result = await route.handler({ request, params });
        return (result === undefined ? null : JSON.parse(JSON.stringify(result))) as T;
      }
      throw new ApiError({
        status: 404,
        code: "MOCK_NOT_FOUND",
        message: `Mock não implementado: ${request.method} ${path}`
      });
    }
  };
}
