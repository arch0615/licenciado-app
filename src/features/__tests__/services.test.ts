import { consumerInvoicesUrl, legalLinks } from "@/config/links";
import { clientInvitationLink } from "@/features/clients/client-invitation";
import { listClients } from "@/features/clients/client.service";
import { getDocumentViewUrl } from "@/features/documents/document.service";
import { isSafeInAppPath } from "@/features/notifications/push";
import { codeInviteLink } from "@/features/team/team.service";
import { createApiClient } from "@/services/api/client";
import { toPage } from "@/services/api/pagination";
import type { ApiRequest } from "@/services/api/types";

function recordingApi(respond: (request: ApiRequest) => unknown = () => ({})) {
  const requests: ApiRequest[] = [];
  const api = createApiClient({
    kind: "mock",
    async request<T>(request: ApiRequest): Promise<T> {
      requests.push(request);
      return respond(request) as T;
    }
  });
  return { api, requests };
}

describe("pagination", () => {
  it("reads every list envelope used by the ACVEL services", () => {
    expect(toPage([1, 2])).toMatchObject({ items: [1, 2], total: 2 });
    expect(toPage({ data: [1], meta: { total: 9, page: 2, perPage: 1 } })).toEqual({ items: [1], total: 9, page: 2, pageSize: 1 });
    expect(toPage({ items: [1], total: 5, page: 1, pageSize: 1 })).toEqual({ items: [1], total: 5, page: 1, pageSize: 1 });
    expect(toPage({ total: 3, data: [1, 2, 3] })).toMatchObject({ items: [1, 2, 3], total: 3 });
    expect(toPage(null).items).toEqual([]);
  });
});

describe("clients", () => {
  it("never sends tenant or user ids; routes exact CPF to the cpf filter", async () => {
    const { api, requests } = recordingApi(() => ({ data: [], meta: { total: 0, page: 1, perPage: 20 } }));
    await listClients(api, { search: "123.456.789-01" }, 1);
    await listClients(api, { search: "Maria" }, 1);
    expect(requests[0]?.query).toMatchObject({ cpf: "12345678901", nome: undefined });
    expect(requests[1]?.query).toMatchObject({ nome: "Maria", cpf: undefined });
    for (const request of requests) {
      expect(request.query).not.toHaveProperty("licenciado_id");
      expect(request.query).not.toHaveProperty("user_id");
    }
  });

  it("builds the consumer self-registration link without external services", () => {
    expect(clientInvitationLink("REP 01", "https://app.acvel.test/")).toBe(
      "https://app.acvel.test/auth/cadastro?codigo_representante=REP%2001"
    );
    expect(clientInvitationLink("REP01", "")).toBeNull();
  });
});

describe("documents (read-only)", () => {
  it("returns only absolute https view URLs", async () => {
    const https = recordingApi(() => ({ signed_url: "https://storage.test/doc?sig=1" }));
    await expect(getDocumentViewUrl(https.api, "d1")).resolves.toBe("https://storage.test/doc?sig=1");
    expect(https.requests[0]).toMatchObject({ method: "GET", path: "/v1/documentos/d1/signed-url" });
    const relative = recordingApi(() => ({ signed_url: "/v1/documentos/d1/content" }));
    await expect(getDocumentViewUrl(relative.api, "d1")).resolves.toBeNull();
    const plain = recordingApi(() => ({ signed_url: "http://storage.test/doc" }));
    await expect(getDocumentViewUrl(plain.api, "d1")).resolves.toBeNull();
  });
});

describe("team invite link (share only)", () => {
  it("builds the web-portal signup link and needs the portal URL", () => {
    expect(codeInviteLink("LIC 1", "https://portal.acvel.test")).toBe(
      "https://portal.acvel.test/auth/register/sublicenciado?codigo=LIC%201"
    );
    expect(codeInviteLink("LIC1", "")).toBeNull();
  });
});

describe("notifications", () => {
  it("only follows relative in-app paths", () => {
    expect(isSafeInAppPath("/clients/cli-1")).toBe(true);
    expect(isSafeInAppPath("https://evil.test")).toBe(false);
    expect(isSafeInAppPath("//evil.test")).toBe(false);
    expect(isSafeInAppPath("javascript:alert(1)")).toBe(false);
    expect(isSafeInAppPath(null)).toBe(false);
  });
});

describe("portal links (env-based)", () => {
  const terms = "https://portal.acvel.test/termos-de-uso-e-privacidade";

  it("shows one combined link when terms and privacy are the same page", () => {
    expect(legalLinks(terms, terms)).toEqual([{ label: "Termos de uso e privacidade", url: terms }]);
    expect(legalLinks(terms, "https://portal.acvel.test/privacidade")).toHaveLength(2);
    expect(legalLinks("", "")).toEqual([]);
  });

  it("opens the invoice list (never an invoice detail) and needs the consumer URL", () => {
    expect(consumerInvoicesUrl("https://cliente.acvel.test/")).toBe("https://cliente.acvel.test/faturas");
    expect(consumerInvoicesUrl("")).toBeNull();
  });
});
