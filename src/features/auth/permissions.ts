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

export function hasPermission(me: Pick<AuthMe, "permissions" | "tipoUsuarioResolvido">, permission: Permission): boolean {
  const granted = me.permissions ?? ROLE_DEFAULTS[me.tipoUsuarioResolvido];
  return granted.includes(permission);
}
