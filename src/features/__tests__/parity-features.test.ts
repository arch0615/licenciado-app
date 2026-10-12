import type { AuthMe } from "@/features/auth/types";
import { commissionEligibility, hasPaymentReceipt } from "@/features/commissions/commission.service";
import { listDocuments, uploadDocument, validatePickedFile } from "@/features/documents/document.service";
import { canCancelOrder, mapProduct, placeOrder } from "@/features/marketplace/marketplace.service";
import { saveTerms, startOnboarding, submitOnboarding } from "@/features/onboarding/onboarding.service";
import { mapNotificationPreferences, mapPreferences, savePreferences } from "@/features/settings/settings.service";
import { whatsappSupportUrl } from "@/features/support/support.service";
import { onboardingStepLabel, paymentMethodLabel, ucRequestStatusLabel } from "@/lib/status-labels";
import { createApiClient } from "@/services/api/client";
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

const licenciado = { tipoUsuarioResolvido: "LICENCIADO", licenciadoId: "lic-1", sublicenciadoId: null } as unknown as AuthMe;
const representative = { tipoUsuarioResolvido: "SUBLICENCIADO", licenciadoId: "lic-1", sublicenciadoId: "sub-9" } as unknown as AuthMe;

describe("settings (LGPD)", () => {
  it("never assumes consent: missing values are off", () => {
    const prefs = mapPreferences({});
    expect(prefs.privacy.marketingOptIn).toBe(false);
    expect(Object.values(prefs.privacy.channelConsent)).toEqual([false, false, false, false]);
    expect(mapPreferences({ privacy: { channelConsent: { email: "true" } } }).privacy.channelConsent.email).toBe(false);
    expect(mapNotificationPreferences({ documentos: true, compensacao: 1 })).toEqual({
      documentos: true,
      ativacaoUc: false,
      inadimplencia: false,
      compensacao: false
    });
  });

  it("saves to the self route without ids", async () => {
    const { api, requests } = recordingApi(() => ({}));
    await savePreferences(api, mapPreferences({}));
    expect(requests[0]).toMatchObject({ method: "PUT", path: "/v1/licenciado-settings/me/preferences" });
    expect(JSON.stringify(requests[0]?.body)).not.toContain("licenciado_id");
  });
});

describe("onboarding", () => {
  it("refuses to send terms without explicit acceptance and signature", () => {
    const { api } = recordingApi();
    expect(() => saveTerms(api, licenciado, { accepted_contract: true, accepted_privacy_policy: false, digital_signature: "Ana", terms_version: "v1" })).toThrow();
    expect(() => saveTerms(api, licenciado, { accepted_contract: true, accepted_privacy_policy: true, digital_signature: "  ", terms_version: "v1" })).toThrow();
  });

  it("targets the server-resolved id for each role", async () => {
    const { api, requests } = recordingApi(() => ({}));
    await startOnboarding(api, licenciado);
    await startOnboarding(api, representative);
    await submitOnboarding(api, representative, "k1");
    expect(requests.map((r) => `${r.method} ${r.path}`)).toEqual([
      "POST /v1/onboarding/iniciar",
      "POST /v1/onboarding/iniciar-sublicenciado",
      "POST /v1/onboarding/sublicenciado/sub-9/submit"
    ]);
    expect(requests[2]?.idempotencyKey).toBe("k1");
  });
});

describe("documents", () => {
  it("validates type and size like the portal", () => {
    expect(validatePickedFile({ uri: "f", name: "a.pdf", size: 1000, mimeType: "application/pdf" })).toBeNull();
    expect(validatePickedFile({ uri: "f", name: "a.jpg", size: 7 * 1024 * 1024, mimeType: "image/jpeg" })).toMatch(/6 MB/);
    expect(validatePickedFile({ uri: "f", name: "a.zip", size: 10, mimeType: "application/zip" })).not.toBeNull();
  });

  it("never exposes the storage path", async () => {
    const { api } = recordingApi(() => ({ data: [{ id: "d1", tipo: "RG", status_validacao: "PENDENTE", arquivo_path: "secret/path" }] }));
    const items = await listDocuments(api, { proprietario_tipo: "LICENCIADO", licenciado_id: "lic-1" } as never);
    expect(items).toHaveLength(1);
    expect(JSON.stringify(items)).not.toContain("secret/path");
  });

  it("rejects an invalid file before calling the backend", async () => {
    const { api, requests } = recordingApi();
    await expect(
      uploadDocument(api, { proprietario_tipo: "LICENCIADO", licenciado_id: "lic-1" } as never, "RG", {
        uri: "f",
        name: "a.zip",
        size: 10,
        mimeType: "application/zip"
      })
    ).rejects.toThrow();
    expect(requests).toHaveLength(0);
  });
});

describe("marketplace", () => {
  it("orders one unit with an idempotency key; cancel only while pending", async () => {
    const { api, requests } = recordingApi(() => ({ id: "o1", pontos_gastos: "100" }));
    const order = await placeOrder(api, "p1", "key-1");
    expect(order.pontos_gastos).toBe(100);
    expect(requests[0]).toMatchObject({ method: "POST", path: "/v1/pedidos", body: { produto_id: "p1", quantidade: 1 }, idempotencyKey: "key-1" });
    expect(canCancelOrder({ status: "PENDENTE" })).toBe(true);
    expect(canCancelOrder({ status: "PROCESSANDO" })).toBe(true);
    expect(canCancelOrder({ status: "ENTREGUE" })).toBe(false);
  });
});

describe("commissions and support helpers", () => {
  it("uses backend eligibility when present", () => {
    expect(commissionEligibility({ elegivel: false } as never).canGenerate).toBe(false);
    expect(hasPaymentReceipt({ status: "PAGO" } as never)).toBe(true);
    expect(hasPaymentReceipt({ status: "EM_LOTE" } as never)).toBe(false);
  });

  it("builds a WhatsApp link only for a valid number", () => {
    expect(whatsappSupportUrl("5511999998888")).toContain("5511999998888");
  });
});

describe("demo display fixes (homologation findings)", () => {
  it("never shows onboarding backend codes", () => {
    expect(onboardingStepLabel("CONFERENCIA_EMPRESA")).toBe("Conferência da empresa");
    expect(onboardingStepLabel("DOCUMENTOS_ENVIADOS")).toBe("Envio de documentos");
    expect(onboardingStepLabel("TERMOS_ACEITOS")).toBe("Aceite dos termos");
    expect(onboardingStepLabel("ALGUMA_ETAPA_NOVA")).toBe("Etapa do cadastro");
    expect(onboardingStepLabel("Enviar RG ou CNH")).toBe("Enviar RG ou CNH");
  });

  it("marks commission criteria unavailable when the backend sends no rule", () => {
    expect(commissionEligibility({ regra_aplicada: null } as never).available).toBe(false);
    expect(commissionEligibility({ regra_aplicada: {} } as never).available).toBe(false);
    expect(commissionEligibility({ regra_aplicada: { fatura_paga: true } } as never).available).toBe(true);
  });

  it("maps product stock only when the backend sends a number", () => {
    expect(mapProduct({ id: "p", nome: "x", estoque_disponivel: 50 }).estoque_disponivel).toBe(50);
    expect(mapProduct({ id: "p", nome: "x", estoque_disponivel: "50" }).estoque_disponivel).toBe(50);
    expect(mapProduct({ id: "p", nome: "x" }).estoque_disponivel).toBeNull();
  });
});

describe("portal wording parity", () => {
  it("labels UC requests with the portal names, never the backend code", () => {
    expect(ucRequestStatusLabel("EM_ANALISE_ADMIN")).toBe("Em análise pela ACVEL");
    expect(ucRequestStatusLabel("ATIVA_COMPENSANDO")).toBe("Compensando");
    expect(ucRequestStatusLabel("ALGO_NOVO")).toBe("Em atualização");
  });

  it("shows payment methods as labels and hides unknown codes", () => {
    expect(paymentMethodLabel("PIX")).toBe("Pix");
    expect(paymentMethodLabel("XYZ")).toBeNull();
  });
});
