import type { AuthIdentity } from "./types";

export type AuthErrorCode =
  | "invalid-credentials"
  | "too-many-requests"
  | "network"
  | "user-disabled"
  | "not-configured"
  | "weak-password"
  | "wrong-current-password"
  | "requires-recent-login"
  | "unknown";

const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  "invalid-credentials": "E-mail ou senha incorretos.",
  "weak-password": "A nova senha é fraca. Use pelo menos 8 caracteres com letras e números.",
  "wrong-current-password": "A senha atual está incorreta.",
  "requires-recent-login": "Por segurança, entre novamente e repita a operação.",
  "too-many-requests": "Muitas tentativas. Tente novamente em alguns minutos.",
  network: "Sem conexão com a internet. Verifique sua rede e tente novamente.",
  "user-disabled": "Seu acesso está bloqueado. Fale com o suporte.",
  "not-configured": "O login ainda não está disponível nesta versão do aplicativo.",
  unknown: "Não foi possível entrar. Tente novamente."
};

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  constructor(code: AuthErrorCode) {
    super(AUTH_ERROR_MESSAGES[code]);
    this.name = "AuthError";
    this.code = code;
  }
}

/** Maps Firebase Auth error codes to app errors (used by the future Firebase gateway). */
export function mapFirebaseAuthErrorCode(code: string | undefined): AuthErrorCode {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "invalid-credentials";
    case "auth/too-many-requests":
      return "too-many-requests";
    case "auth/network-request-failed":
      return "network";
    case "auth/user-disabled":
      return "user-disabled";
    case "auth/weak-password":
      return "weak-password";
    case "auth/requires-recent-login":
      return "requires-recent-login";
    default:
      return "unknown";
  }
}

/**
 * Identity provider abstraction. Production: Firebase Authentication (JS SDK, FirebaseAuthGateway).
 * Development: MockAuthGateway (EXPO_PUBLIC_USE_MOCKS=true).
 * The backend only ever receives `Authorization: Bearer <ID token>` from `getIdToken`.
 */
export interface AuthGateway {
  readonly kind: "mock" | "firebase" | "unconfigured";
  /** Restores a persisted session, if any. Resolves once the initial identity is known. */
  initialize(): Promise<AuthIdentity | null>;
  onIdentityChanged(listener: (identity: AuthIdentity | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  getIdToken(forceRefresh?: boolean): Promise<string | null>;
  /** Sends the provider's password-reset e-mail. Resolves even for unknown e-mails (no account enumeration). */
  sendPasswordReset(email: string): Promise<void>;
  /** Re-authenticates with the current password, then sets the new one. */
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
}

/**
 * Used when mocks are off and Firebase is not wired yet: always signed out, sign-in refused.
 * Fails closed — the app never pretends to be authenticated.
 */
export class UnconfiguredAuthGateway implements AuthGateway {
  readonly kind = "unconfigured" as const;
  async initialize(): Promise<AuthIdentity | null> {
    return null;
  }
  onIdentityChanged(): () => void {
    return () => undefined;
  }
  async signIn(): Promise<void> {
    throw new AuthError("not-configured");
  }
  async signOut(): Promise<void> {}
  async getIdToken(): Promise<string | null> {
    return null;
  }
  async sendPasswordReset(): Promise<void> {
    throw new AuthError("not-configured");
  }
  async changePassword(): Promise<void> {
    throw new AuthError("not-configured");
  }
}
