import { clientInvitationLink } from "@/features/clients/client-invitation";
import { listClients } from "@/features/clients/client.service";
import { uploadDocument, validatePickedFile } from "@/features/documents/document.service";
import { isSafeInAppPath } from "@/features/notifications/push";
import { updateProfile } from "@/features/profile/profile.service";
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

describe("profile", () => {
  it("licenciado: PATCH /v1/licenciados/{id from /auth/me} with name and phone only, then re-reads /me", async () => {
    const { api, requests } = recordingApi(() => ({}));
    await updateProfile(api, { tipoUsuarioResolvido: "LICENCIADO", licenciadoId: "lic-9" }, { nome_completo: "A", telefone: "1", email: "x@y.z" });
    expect(requests[0]).toMatchObject({ method: "PATCH", path: "/v1/licenciados/lic-9", body: { nome_completo: "A", telefone: "1", celular: "1" } });
    expect(requests[0]?.body).not.toHaveProperty("email");
    expect(requests[1]).toMatchObject({ method: "GET", path: "/v1/licenciados/me" });
  });

  it("representatives cannot update (no live endpoint) and nothing is sent", async () => {
    const { api, requests } = recordingApi(() => ({}));
    await expect(
      updateProfile(api, { tipoUsuarioResolvido: "SUBLICENCIADO", licenciadoId: "lic-1" }, { nome_completo: "A" })
    ).rejects.toMatchObject({ code: "PROFILE_UPDATE_UNSUPPORTED" });
    expect(requests).toHaveLength(0);
  });
});

describe("documents", () => {
  const file = { uri: "file:///doc.pdf", name: "doc.pdf", size: 1000, mimeType: "application/pdf" };
  const owner = { proprietario_tipo: "LICENCIADO" as const, licenciado_id: "lic-1" };

  it("validates type and size before uploading", () => {
    expect(validatePickedFile({ ...file, mimeType: "text/plain" })).toMatch(/foto ou um PDF/);
    expect(validatePickedFile({ ...file, size: 13 * 1024 * 1024 })).toMatch(/12 MB/);
    expect(validatePickedFile({ ...file, mimeType: "image/jpeg", size: 7 * 1024 * 1024 })).toMatch(/6 MB/);
    expect(validatePickedFile(file)).toBeNull();
  });

  it("uploads to an absolute presigned URL without the Firebase token, then confirms", async () => {
    const { api, requests } = recordingApi((request) =>
      request.path === "/v1/documentos/presign-upload"
        ? { upload_url: "https://storage.test/put?sig=1", upload_method: "PUT", arquivo_path: "p/1", expires_at: "" }
        : { id: "d1" }
    );
    const fetchImpl = jest.fn(async (url: RequestInfo | URL) =>
      String(url).startsWith("file:") ? new Response("bytes") : new Response(null, { status: 200 })
    ) as unknown as typeof fetch;
    await uploadDocument(api, owner, "RG", file, { fetchImpl, hash: async () => "abc123" });
    expect(requests[0]?.body).toMatchObject({ arquivo_checksum: "abc123", arquivo_mime_type: "application/pdf", arquivo_tamanho: 1000 });
    expect(requests[1]?.body).toMatchObject({ arquivo_checksum: "abc123", arquivo_path: "p/1" });
    const put = (fetchImpl as unknown as jest.Mock).mock.calls.find(([url]) => String(url).startsWith("https://"));
    expect(put?.[1]).toMatchObject({ method: "PUT", headers: { "Content-Type": "application/pdf" } });
    expect(JSON.stringify(put?.[1]?.headers)).not.toMatch(/Authorization/i);
    expect(requests.map((request) => request.path)).toEqual(["/v1/documentos/presign-upload", "/v1/documentos/confirm-upload"]);
  });

  it("refuses non-https absolute upload URLs", async () => {
    const { api } = recordingApi(() => ({ upload_url: "http://evil.test/put", arquivo_path: "p" }));
    const fetchImpl = jest.fn(async () => new Response("bytes")) as unknown as typeof fetch;
    await expect(uploadDocument(api, owner, "RG", file, { fetchImpl, hash: async () => "x" })).rejects.toMatchObject({ code: "UPLOAD_URL_REJECTED" });
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
