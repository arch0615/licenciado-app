import type { AccountRole, AuthMe, Permission } from "./types";

/**
 * Role defaults, mirroring licenciado-api `ROLE_PERMISSIONS` (src/auth/context.ts). Used ONLY when the
 * auth service does not return a permission list. They decide what the UI shows, never what the user
 * may do: every request is still authorized by the backend (403 → permission error).
 */
const ROLE_DEFAULTS: Record<AccountRole, readonly Permission[]> = {
  LICENCIADO: [
    "profile:read",
    "profile:update",
    "onboarding:self",
    "team:read",
    "team:invite",
    "clients:read",
    "clients:write",
    "commissions:read",
    "payments:read",
    "marketplace:use",
    "training:use",
    "support:use",
    "notifications:read"
  ],
  SUBLICENCIADO: [
    "profile:read",
    "profile:update",
    "onboarding:self",
    "clients:read",
    "clients:write",
    "commissions:read",
    "training:use",
    "support:use",
    "notifications:read"
  ],
  STAFF: []
};

const APP_PERMISSIONS: ReadonlySet<string> = new Set<Permission>([
  ...ROLE_DEFAULTS.LICENCIADO,
  ...ROLE_DEFAULTS.SUBLICENCIADO,
  "admin:licenciados:read"
]);

/**
 * Live ACVEL `/v1/auth/me` permissions are objects `{ resource, action, scope, level }`.
 * Only these explicit `resource:ACTION` pairs grant an app permission; anything else grants nothing.
 * The live API has no training resource, so `training:use` is never granted from the live list.
 */
const LIVE_PERMISSION_MAP: Readonly<Record<string, Permission>> = {
  "licenciado:READ": "profile:read",
  "licenciado:UPDATE": "profile:update",
  "onboarding:READ": "onboarding:self",
  "sublicenciado:READ": "team:read",
  "sublicenciado:CREATE": "team:invite",
  "consumidor:READ": "clients:read",
  "consumidor:CREATE": "clients:write",
  "comissao:READ": "commissions:read",
  "pagamento:READ": "payments:read",
  "marketplace:READ": "marketplace:use",
  "suporte:READ": "support:use",
  "notificacao:READ": "notifications:read"
};

/**
 * Normalizes the permission list of `/v1/auth/me`:
 * - legacy strings (`"clients:read"`) are kept when they are known app permissions;
 * - live objects (`{ resource: "consumidor", action: "READ", scope: "OWN" }`) are mapped through
 *   LIVE_PERMISSION_MAP;
 * - unknown entries are dropped (never granted).
 * Returns `null` only when the response has no permission list at all (legacy service), so the UI can
 * fall back to role defaults. A present-but-unmapped list yields `[]`, which grants nothing.
 */
export function normalizePermissions(raw: unknown): Permission[] | null {
  if (!Array.isArray(raw)) return null;
  const granted = new Set<Permission>();
  for (const entry of raw) {
    if (typeof entry === "string") {
      if (APP_PERMISSIONS.has(entry)) granted.add(entry as Permission);
      continue;
    }
    if (entry && typeof entry === "object") {
      const { resource, action } = entry as { resource?: unknown; action?: unknown };
      if (typeof resource !== "string" || typeof action !== "string") continue;
      const mapped = LIVE_PERMISSION_MAP[`${resource.trim().toLowerCase()}:${action.trim().toUpperCase()}`];
      if (mapped) granted.add(mapped);
    }
  }
  return [...granted];
}

export function hasPermission(me: Pick<AuthMe, "permissions" | "tipoUsuarioResolvido">, permission: Permission): boolean {
  const granted = me.permissions ?? ROLE_DEFAULTS[me.tipoUsuarioResolvido];
  return granted.includes(permission);
}
