import { QueryClient } from "@tanstack/react-query";

import { isApiError } from "@/services/api/errors";

/**
 * Shared React Query defaults:
 * - no retries for client errors (4xx) — they won't succeed by retrying;
 * - up to 2 retries for network/5xx with backoff;
 * - data considered fresh for 30s (lists refresh on focus and pull-to-refresh).
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          if (isApiError(error) && error.isClientError) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: true
      },
      mutations: {
        retry: false
      }
    }
  });
}
