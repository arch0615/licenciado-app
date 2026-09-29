import type { AppStatus, AuthMe } from "@/features/auth/types";
import type { MockRoute } from "@/services/api/mock-transport";

import { mockState } from "./mock-state";
import { accountRoutes, currentMe } from "./routes/account";
import { clientRoutes } from "./routes/clients";
import { commissionRoutes } from "./routes/commissions";
import { engagementRoutes } from "./routes/engagement";
import { teamRoutes } from "./routes/team";

/**
 * Mock backend routes (EXPO_PUBLIC_USE_MOCKS=true only). Paths and payloads follow the licenciado-api
 * Swagger or, for modules it does not cover yet, backend-api-inventory.md — so switching mocks off
 * requires no feature-code change. Routes are matched in order: static paths before `:params`.
 */
export const mockRoutes: MockRoute[] = [
  {
    method: "GET",
    path: "/v1/app/status",
    handler: (): AppStatus => ({
      maintenance: mockState.maintenanceEnabled,
      message: mockState.maintenanceEnabled ? "Manutenção simulada (modo mock)." : null
    })
  },
  { method: "GET", path: "/v1/auth/me", handler: (): AuthMe => currentMe() },
  ...accountRoutes,
  ...clientRoutes,
  ...commissionRoutes,
  ...teamRoutes,
  ...engagementRoutes
];
