import live from "../../../../docs/openapi/acvel-business-live.json";

/**
 * Contract check against the live ACVEL business API Swagger
 * (docs/openapi/acvel-business-live.json, downloaded from {BUSINESS_API_URL}/docs-json — refresh it with
 * `npm run openapi:pull` whenever the backend changes). Live paths carry the service's `/api` prefix,
 * which the gateway maps from `{BUSINESS_API_URL}`: app path `/v1/x` = live path `/api/v1/x`.
 *
 * - LIVE: business endpoints the app calls; they MUST exist with the same method.
 * - NOT_LIVE: endpoints the app calls that the live API does not have. The app degrades for each
 *   (see docs/live-api-validation.md). This test fails — on purpose — when the backend adds one.
 * The auth service publishes no Swagger; its routes are checked in the live validation report.
 */
type Endpoint = [method: string, path: string];

const LIVE: Endpoint[] = [
  ["get", "/v1/licenciados/me"],
  ["patch", "/v1/licenciados/{id}"],
  ["post", "/v1/licenciados/bootstrap-me"],
  ["get", "/v1/licenciados/me/contrato"],
  ["get", "/v1/sublicenciados/me"],
  ["post", "/v1/sublicenciados/bootstrap-me"],
  ["post", "/v1/sublicenciados/validate-codigo"],
  ["get", "/v1/sublicenciados/equipe"],
  ["get", "/v1/sublicenciados/{id}"],
  ["get", "/v1/consumidores"],
  ["post", "/v1/consumidores"],
  ["get", "/v1/consumidores/{id}"],
  ["get", "/v1/acompanhamento/cards"],
  ["get", "/v1/acompanhamento/alertas"],
  ["get", "/v1/acompanhamento/{consumidorId}"],
  ["get", "/v1/comissoes/stats"],
  ["get", "/v1/comissoes"],
  ["get", "/v1/comissoes/{id}"],
  ["get", "/v1/pagamentos-licenciados"],
  ["get", "/v1/pagamentos-licenciados/{id}/extrato"],
  ["get", "/v1/dashboards/licenciado-central/{id}"],
  ["get", "/v1/notifications/me/summary"],
  ["get", "/v1/notifications/me"],
  ["post", "/v1/notifications/me/{id}/read"],
  ["post", "/v1/notifications/me/read-all"],
  ["get", "/v1/support/tickets"],
  ["post", "/v1/support/tickets"],
  ["get", "/v1/support/tickets/{id}"],
  ["get", "/v1/support/tickets/{id}/messages"],
  ["post", "/v1/support/tickets/{id}/messages"],
  ["patch", "/v1/support/tickets/{id}/status"],
  ["get", "/v1/training/summary"],
  ["get", "/v1/training/courses"],
  ["get", "/v1/training/courses/{courseId}"],
  ["get", "/v1/training/courses/{courseId}/lessons"],
  ["post", "/v1/training/courses/{courseId}/lessons/{lessonId}/complete"],
  ["get", "/v1/onboarding/licenciado/{id}"],
  ["get", "/v1/onboarding/sublicenciado/{id}"],
  ["post", "/v1/onboarding/iniciar"],
  ["post", "/v1/onboarding/iniciar-sublicenciado"],
  ["put", "/v1/onboarding/licenciado/{id}/etapas/documentos"],
  ["put", "/v1/onboarding/sublicenciado/{id}/etapas/documentos"],
  ["post", "/v1/onboarding/licenciado/{id}/submit"],
  ["post", "/v1/onboarding/sublicenciado/{id}/submit"],
  ["get", "/v1/documentos"],
  ["post", "/v1/documentos/presign-upload"],
  ["post", "/v1/documentos/confirm-upload"],
  ["post", "/v1/documentos/{id}/reenviar"],
  ["get", "/v1/pedidos/me/context"],
  ["get", "/v1/produtos"],
  ["get", "/v1/pedidos"],
  ["post", "/v1/pedidos"],
  ["post", "/v1/pedidos/{id}/cancel"]
];

const NOT_LIVE: Endpoint[] = [
  ["get", "/v1/app/status"],
  ["patch", "/v1/licenciados/me"],
  ["patch", "/v1/sublicenciados/me"],
  ["get", "/v1/sublicenciados/convites"],
  ["post", "/v1/sublicenciados/convites"],
  ["delete", "/v1/sublicenciados/convites/{id}"],
  ["post", "/v1/convites/validar"]
];

const normalize = (path: string) => path.replace(/^\/api/, "").replace(/\{[^}]+\}/g, "{}");
const operations = new Set<string>();
for (const [path, item] of Object.entries((live as { paths: Record<string, Record<string, unknown>> }).paths)) {
  for (const method of Object.keys(item)) operations.add(`${method} ${normalize(path)}`);
}
const has = (method: string, path: string) => operations.has(`${method} ${normalize(path)}`);

type Schema = { required?: string[]; properties?: Record<string, unknown>; $ref?: string };
const schemas = (live as { components: { schemas: Record<string, Schema> } }).components.schemas;
function requestBody(method: string, path: string): Schema {
  const op = (live as { paths: Record<string, Record<string, { requestBody?: { content: Record<string, { schema: Schema }> } }>> })
    .paths[`/api${path}`]![method]!;
  const schema = op.requestBody!.content["application/json"]!.schema;
  return schema.$ref ? schemas[schema.$ref.split("/").pop()!]! : schema;
}

describe("live ACVEL business API contract", () => {
  it.each(LIVE)("%s %s exists", (method, path) => {
    expect(has(method, path)).toBe(true);
  });

  it.each(NOT_LIVE)("%s %s is still missing (app degrades)", (method, path) => {
    expect(has(method, path)).toBe(false);
  });

  it("document upload requires the checksum the app now sends", () => {
    expect(requestBody("post", "/v1/documentos/presign-upload").required).toEqual(
      expect.arrayContaining(["arquivo_nome", "arquivo_mime_type", "arquivo_tamanho", "arquivo_checksum", "tipo", "proprietario_tipo"])
    );
  });

  it("representative bootstrap requires codigo_licenciado", () => {
    expect(requestBody("post", "/v1/sublicenciados/bootstrap-me").required).toEqual(["codigo_licenciado"]);
  });

  it("KNOWN MISMATCH: create client requires client-supplied ids and a full address", () => {
    // The app does not send user_id/licenciado_id (ids must come from the token) nor an address
    // (not collected in step 1). Until the backend relaxes this, POST /v1/consumidores returns 400.
    expect(requestBody("post", "/v1/consumidores").required).toEqual(
      expect.arrayContaining(["user_id", "licenciado_id", "cep", "logradouro", "numero", "bairro", "cidade", "uf"])
    );
  });
});
