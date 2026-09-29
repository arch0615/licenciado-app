import openapi from "../../../../docs/openapi/licenciado-api.json";

/**
 * Contract check against the committed licenciado-api Swagger snapshot
 * (docs/openapi/licenciado-api.json — refresh it whenever the backend changes).
 *
 * - "swagger" endpoints MUST exist in the snapshot with the same method.
 * - "inventory" endpoints come from licenciado-web/docs/backend-api-inventory.md (legacy business
 *   service). They are asserted ABSENT so this test fails — on purpose — the day the backend
 *   publishes them, prompting a move to "swagger" and a payload review.
 */
type Endpoint = [method: string, path: string];

const SWAGGER: Endpoint[] = [
  ["get", "/v1/auth/me"],
  ["post", "/v1/auth/register-licenciado"],
  ["post", "/v1/auth/register-sublicenciado"],
  ["get", "/v1/licenciados/me"],
  ["patch", "/v1/licenciados/me"],
  ["post", "/v1/licenciados/bootstrap-me"],
  ["get", "/v1/sublicenciados/me"],
  ["patch", "/v1/sublicenciados/me"],
  ["post", "/v1/sublicenciados/bootstrap-me"],
  ["get", "/v1/sublicenciados/equipe"],
  ["get", "/v1/sublicenciados/{sublicenciadoId}"],
  ["get", "/v1/sublicenciados/convites"],
  ["post", "/v1/sublicenciados/convites"],
  ["delete", "/v1/sublicenciados/convites/{invitationId}"],
  ["post", "/v1/convites/validar"]
];

const INVENTORY: Endpoint[] = [
  ["get", "/v1/app/status"],
  ["get", "/v1/auth/sessions/me"],
  ["post", "/v1/auth/account/delete-request"],
  ["get", "/v1/licenciados/me/contrato"],
  ["get", "/v1/consumidores"],
  ["post", "/v1/consumidores"],
  ["get", "/v1/consumidores/{id}"],
  ["get", "/v1/acompanhamento/cards"],
  ["get", "/v1/acompanhamento/alertas"],
  ["get", "/v1/comissoes/stats"],
  ["get", "/v1/comissoes"],
  ["get", "/v1/pagamentos-licenciados"],
  ["get", "/v1/dashboards/licenciado-central/{licenciadoId}"],
  ["get", "/v1/notifications/me"],
  ["get", "/v1/support/tickets"],
  ["get", "/v1/training/courses"],
  ["get", "/v1/onboarding/licenciado/{id}"],
  ["post", "/v1/documentos/presign-upload"],
  ["get", "/v1/produtos"],
  ["post", "/v1/pedidos"]
];

const paths = (openapi as { paths: Record<string, Record<string, unknown>> }).paths;

describe("licenciado-api contract (Swagger snapshot)", () => {
  it.each(SWAGGER)("%s %s exists in Swagger", (method, path) => {
    expect(paths[path]?.[method]).toBeDefined();
  });

  it.each(INVENTORY)("%s %s is still inventory-only (not in Swagger)", (method, path) => {
    expect(paths[path]?.[method]).toBeUndefined();
  });

  it("GET /v1/auth/me returns the fields the router depends on", () => {
    const schema = (paths["/v1/auth/me"]?.get as {
      responses: Record<string, { content: Record<string, { schema: { required?: string[] } }> }>;
    }).responses["200"]!.content["application/json"]!.schema;
    expect(schema.required).toEqual(
      expect.arrayContaining(["userId", "tipoUsuarioResolvido", "permissions", "licenciadoId", "approvalStatus"])
    );
  });
});
