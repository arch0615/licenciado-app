import { ApiError } from "@/services/api/errors";
import type { ApiClient, ApiRequest } from "@/services/api/types";
import { createApiClient } from "@/services/api/client";

import { approvalFromStatus, fetchMe, normalizeAuthMe } from "../auth.service";
import { hasPermission } from "../permissions";

/** Records requests and answers from a path → response map (Error instances are thrown). */
function fakeApi(responses: Record<string, unknown>): { api: ApiClient; requests: ApiRequest[] } {
  const requests: ApiRequest[] = [];
  const api = createApiClient({
    kind: "mock",
    async request<T>(request: ApiRequest): Promise<T> {
      requests.push(request);
      const response = responses[request.path];
      if (response instanceof Error) throw response;
      if (response === undefined) throw new ApiError({ status: 404, code: "NOT_FOUND", message: "x" });
      return response as T;
    }
  });
  return { api, requests };
}

const swaggerMe = {
  userId: "u1",
  uid: "fb1",
  email: "lic@x.com",
  displayName: null,
  photoURL: null,
  role: "licenciado_master",
  roleSlug: "licenciado_master",
  roles: [{ slug: "licenciado_master" }],
  tipoUsuario: "LICENCIADO",
  tipoUsuarioResolvido: "LICENCIADO",
  permissions: ["profile:read", "team:read"],
  licenciadoId: "lic-1",
  sublicenciadoId: null,
  accountStatus: "APROVADO",
  approvalStatus: "APPROVED"
};

describe("auth service", () => {
  it("uses the server-computed approval from licenciado-api (auth service)", async () => {
    const { api, requests } = fakeApi({ "/v1/auth/me": swaggerMe });
    const me = await fetchMe(api);
    expect(me).toMatchObject({ userId: "u1", tipoUsuarioResolvido: "LICENCIADO", approvalStatus: "APPROVED" });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.service).toBe("auth");
  });

  it("fails closed without a user id or a recognizable role", () => {
    expect(() => normalizeAuthMe({ email: "x" })).toThrow(expect.objectContaining({ code: "PLATFORM_FORBIDDEN" }));
    expect(() => normalizeAuthMe({ userId: "u", roleSlug: "consumidor" })).toThrow(
      expect.objectContaining({ status: 403, code: "PLATFORM_FORBIDDEN" })
    );
  });

  it("never classifies admin_licenciado as a licenciado", () => {
    expect(normalizeAuthMe({ userId: "u", roleSlug: "admin_licenciado" }).tipoUsuarioResolvido).toBe("STAFF");
  });

  it("legacy auth service: derives approval from the licenciado record", async () => {
    const { api } = fakeApi({
      "/v1/auth/me": { uid: "fb1", roleSlug: "licenciado_master" },
      "/v1/licenciados/me": { id: "lic-9", status: "EM_ANALISE" }
    });
    await expect(fetchMe(api)).resolves.toMatchObject({
      licenciadoId: "lic-9",
      accountStatus: "EM_ANALISE",
      approvalStatus: "NOT_APPROVED",
      permissions: null
    });
  });

  it("legacy auth service: 404 business record → NO_RECORD", async () => {
    const { api } = fakeApi({ "/v1/auth/me": { uid: "fb1", tipoUsuarioResolvido: "LICENCIADO" } });
    await expect(fetchMe(api)).resolves.toMatchObject({ approvalStatus: "NO_RECORD", accountStatus: null });
  });

  it("legacy auth service: sublicenciado needs the parent licenciado approved", async () => {
    const { api } = fakeApi({
      "/v1/auth/me": { uid: "fb2", tipoUsuarioResolvido: "SUBLICENCIADO" },
      "/v1/sublicenciados/me": { id: "sub-1", status: "APROVADO", licenciado: { id: "lic-1", status: "SUSPENSO" } }
    });
    await expect(fetchMe(api)).resolves.toMatchObject({ licenciadoId: "lic-1", approvalStatus: "SUSPENDED" });
  });

  it("maps statuses like the backend", () => {
    expect(approvalFromStatus("APROVADO", null, "LICENCIADO")).toBe("APPROVED");
    expect(approvalFromStatus("REPROVADO", null, "LICENCIADO")).toBe("NOT_APPROVED");
    expect(approvalFromStatus("BLOQUEADO", null, "LICENCIADO")).toBe("BLOCKED");
    expect(approvalFromStatus("APROVADO", null, "SUBLICENCIADO")).toBe("NOT_APPROVED");
    expect(approvalFromStatus(null, null, "SUBLICENCIADO")).toBe("NO_RECORD");
  });

  it("permissions: server list wins, role defaults only when absent", () => {
    expect(hasPermission({ tipoUsuarioResolvido: "LICENCIADO", permissions: ["profile:read"] }, "team:read")).toBe(false);
    expect(hasPermission({ tipoUsuarioResolvido: "LICENCIADO", permissions: null }, "team:read")).toBe(true);
    expect(hasPermission({ tipoUsuarioResolvido: "SUBLICENCIADO", permissions: null }, "team:read")).toBe(false);
  });
});
