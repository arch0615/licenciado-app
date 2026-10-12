import live from "../../../../docs/openapi/acvel-business-live.json";

/**
 * Contract check against the live ACVEL business API Swagger
 * (docs/openapi/acvel-business-live.json, downloaded from {BUSINESS_API_URL}/docs-json — refresh it with
 * `npm run openapi:pull` whenever the backend changes). Live paths carry the service's `/api` prefix,
 * which the gateway maps from `{BUSINESS_API_URL}`: app path `/v1/x` = live path `/api/v1/x`.
 *
 * - LIVE: business endpoints the app calls (reads plus the normal-user portal writes); they MUST exist.
 * - NOT_LIVE: endpoints the app calls that the live API does not have. The app degrades for each
 *   (see docs/live-api-validation.md). This test fails — on purpose — when the backend adds one.
 * The auth service publishes no Swagger; its routes are checked in the live validation report.
 */
type Endpoint = [method: string, path: string];

const LIVE: Endpoint[] = [
  ["get", "/v1/licenciados/me"],
  ["get", "/v1/licenciados/me/contrato"],
  ["get", "/v1/sublicenciados/me"],
  ["get", "/v1/sublicenciados/equipe"],
  ["get", "/v1/sublicenciados/{id}"],
  ["get", "/v1/consumidores"],
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
  ["get", "/v1/documentos"],
  ["get", "/v1/documentos/{id}/signed-url"],
  ["get", "/v1/pedidos/me/context"],
  ["get", "/v1/produtos"],
  ["get", "/v1/pedidos"],
  ["post", "/v1/pedidos"],
  ["post", "/v1/pedidos/{id}/cancel"],
  ["get", "/v1/pagamentos-licenciados/{id}/comprovante"],
  ["post", "/v1/dashboards/licenciado-central/{id}/alerts/{alertId}/read"],
  ["post", "/v1/dashboards/licenciado-central/{id}/alerts/{alertId}/resolve"],
  ["get", "/v1/licenciado-settings/me/notification-preferences"],
  ["put", "/v1/licenciado-settings/me/notification-preferences"],
  ["get", "/v1/licenciado-settings/me/preferences"],
  ["put", "/v1/licenciado-settings/me/preferences"],
  ["patch", "/v1/licenciados/{id}"],
  ["post", "/v1/licenciados/bootstrap-me"],
  ["post", "/v1/sublicenciados/bootstrap-me"],
  ["post", "/v1/sublicenciados/validate-codigo"],
  ["post", "/v1/onboarding/iniciar"],
  ["post", "/v1/onboarding/iniciar-sublicenciado"],
  ["post", "/v1/onboarding/validate-uniqueness"],
  ["put", "/v1/onboarding/licenciado/{id}/etapas/dados-pessoais"],
  ["put", "/v1/onboarding/licenciado/{id}/etapas/dados-profissionais"],
  ["put", "/v1/onboarding/licenciado/{id}/etapas/dados-bancarios"],
  ["put", "/v1/onboarding/licenciado/{id}/etapas/documentos"],
  ["put", "/v1/onboarding/licenciado/{id}/etapas/termos"],
  ["post", "/v1/onboarding/licenciado/{id}/submit"],
  ["put", "/v1/onboarding/sublicenciado/{id}/etapas/dados-pessoais"],
  ["put", "/v1/onboarding/sublicenciado/{id}/etapas/documentos"],
  ["put", "/v1/onboarding/sublicenciado/{id}/etapas/termos"],
  ["put", "/v1/onboarding/sublicenciado/{id}/etapas/conferencia-empresa"],
  ["put", "/v1/onboarding/sublicenciado/{id}/etapas/dados-login"],
  ["post", "/v1/onboarding/sublicenciado/{id}/submit"],
  ["post", "/v1/documentos/presign-upload"],
  ["post", "/v1/documentos/confirm-upload"],
  ["post", "/v1/documentos/{id}/reenviar"]
];

const NOT_LIVE: Endpoint[] = [
  ["get", "/v1/app/status"],
  ["get", "/v1/sublicenciados/convites"]
];

const normalize = (path: string) => path.replace(/^\/api/, "").replace(/\{[^}]+\}/g, "{}");
const operations = new Set<string>();
for (const [path, item] of Object.entries((live as { paths: Record<string, Record<string, unknown>> }).paths)) {
  for (const method of Object.keys(item)) operations.add(`${method} ${normalize(path)}`);
}
const has = (method: string, path: string) => operations.has(`${method} ${normalize(path)}`);

describe("live ACVEL business API contract", () => {
  it.each(LIVE)("%s %s exists", (method, path) => {
    expect(has(method, path)).toBe(true);
  });

  it.each(NOT_LIVE)("%s %s is still missing (app degrades)", (method, path) => {
    expect(has(method, path)).toBe(false);
  });
});
