/**
 * Guard for the scope rule: "The client confirmed that mobile apps must provide parity with the normal
 * user-facing production portals. Only ADM/internal operator functionality is excluded."
 *
 * Every mutating API call in the feature services must be a normal-user action that the licenciado portal
 * also performs (allowlist below). ADM/operator endpoints — approval/rejection, financial generation,
 * payment batches, rateio writes, admin settings — must never be referenced.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const FEATURES = join(__dirname, "..");

/** Normal-user writes, each mirroring a licenciado-portal action. */
const ALLOWED_WRITES = new Set([
  // Support (portal /suporte)
  "support/support.service.ts POST /v1/support/tickets",
  "support/support.service.ts POST /v1/support/tickets/{}/messages",
  "support/support.service.ts PATCH /v1/support/tickets/{}/status",
  // Academy progress (portal /treinamentos)
  "academy/academy.service.ts POST /v1/training/courses/{}/lessons/{}/complete",
  // Notifications state (portal /notificacoes)
  "notifications/notification.service.ts POST /v1/notifications/me/{}/read",
  "notifications/notification.service.ts POST /v1/notifications/me/read-all",
  // Dashboard operational alerts (portal dashboard)
  "dashboard/dashboard.service.ts POST /v1/dashboards/licenciado-central/{}/alerts/{}/read",
  "dashboard/dashboard.service.ts POST /v1/dashboards/licenciado-central/{}/alerts/{}/resolve",
  // Security / LGPD (portal /perfil)
  "profile/profile.service.ts DELETE /v1/auth/sessions/me/{}",
  "profile/profile.service.ts DELETE /v1/auth/sessions/me",
  "profile/profile.service.ts POST /v1/auth/account/delete-request",
  // Profile edit and first access (portal /perfil, splash)
  "profile/profile.service.ts PUT /v1/auth/profile",
  "profile/profile.service.ts PATCH /v1/licenciados/{}",
  "profile/profile.service.ts POST /v1/licenciados/bootstrap-me",
  "profile/profile.service.ts POST /v1/sublicenciados/bootstrap-me",
  // Own settings (portal /notificacoes/configuracoes, /perfil/preferencias)
  "settings/settings.service.ts PUT /v1/licenciado-settings/me/notification-preferences",
  "settings/settings.service.ts PUT /v1/licenciado-settings/me/preferences",
  // Registration validations (portal /auth/register*)
  "auth/auth.service.ts POST /v1/auth/register-licenciado",
  "auth/auth.service.ts POST /v1/auth/register-sublicenciado",
  "auth/auth.service.ts POST /v1/sublicenciados/validate-codigo",
  "auth/auth.service.ts POST /v1/convites/validar",
  // Onboarding wizard (portal /onboarding)
  "onboarding/onboarding.service.ts POST /v1/onboarding/iniciar",
  "onboarding/onboarding.service.ts POST /v1/onboarding/iniciar-sublicenciado",
  "onboarding/onboarding.service.ts POST /v1/onboarding/validate-uniqueness",
  "onboarding/onboarding.service.ts PUT {}/etapas/dados-pessoais",
  "onboarding/onboarding.service.ts PUT {}/etapas/dados-profissionais",
  "onboarding/onboarding.service.ts PUT {}/etapas/dados-bancarios",
  "onboarding/onboarding.service.ts PUT {}/etapas/documentos",
  "onboarding/onboarding.service.ts PUT {}/etapas/termos",
  "onboarding/onboarding.service.ts PUT {}/etapas/conferencia-empresa",
  "onboarding/onboarding.service.ts PUT {}/etapas/dados-login",
  "onboarding/onboarding.service.ts POST {}/submit",
  // Own document upload (portal onboarding / perfil)
  "documents/document.service.ts POST /v1/documentos/presign-upload",
  "documents/document.service.ts POST /v1/documentos/{}/reenviar",
  "documents/document.service.ts POST /v1/documentos/confirm-upload",
  // Marketplace (portal /marketplace, behind the server feature flag)
  "marketplace/marketplace.service.ts POST /v1/pedidos",
  "marketplace/marketplace.service.ts POST /v1/pedidos/{}/cancel"
]);

function serviceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" ? [] : serviceFiles(path);
    return name.endsWith(".service.ts") ? [path] : [];
  });
}

function mutatingCalls(): string[] {
  const found: string[] = [];
  for (const file of serviceFiles(FEATURES)) {
    const source = readFileSync(file, "utf8");
    const pattern = /api\.(post|put|patch|delete)(?:<[^>]*>)?\(\s*(["'`])([^"'`]*)\2/g;
    for (const match of source.matchAll(pattern)) {
      const path = match[3]!.replace(/\$\{[^}]*\}/g, "{}");
      found.push(`${relative(FEATURES, file).replace(/\\/g, "/")} ${match[1]!.toUpperCase()} ${path}`);
    }
  }
  return found.sort();
}

describe("portal parity scope (ADM/internal excluded)", () => {
  it("every write is an approved normal-user portal action", () => {
    const unexpected = mutatingCalls().filter((call) => !ALLOWED_WRITES.has(call));
    expect(unexpected).toEqual([]);
  });

  it("no ADM/internal operator endpoint is referenced", () => {
    const sources = serviceFiles(FEATURES)
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    for (const forbidden of [
      "/aprovar",
      "/reprovar",
      "/admin",
      "/v1/comissoes/gerar",
      "/v1/lotes",
      "/v1/configuracoes",
      "/validar-documento"
    ]) {
      expect(sources).not.toContain(forbidden);
    }
    const calls = mutatingCalls().join("\n");
    // Financial records are generated by the backend: the app never writes commissions, payments or invoices.
    for (const forbidden of ["/v1/comissoes", "/v1/pagamentos-licenciados", "/v1/faturas"]) {
      expect(calls).not.toContain(forbidden);
    }
  });

  it("no service writes to the rateio backend", () => {
    for (const file of serviceFiles(FEATURES)) {
      expect(readFileSync(file, "utf8")).not.toMatch(/service:\s*["']rateio["']/);
    }
  });
});
