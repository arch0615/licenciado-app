import { AuthError, type AuthGateway } from "@/features/auth/auth-gateway";
import type { AuthIdentity } from "@/features/auth/types";

import { mockState } from "./mock-state";
import { DEFAULT_PERSONA_ID, findPersona, findPersonaByEmail, type MockPersonaId } from "./personas";

function identityFor(id: MockPersonaId | null): AuthIdentity | null {
  const persona = findPersona(id);
  if (!persona) return null;
  return { uid: `mock-${persona.id}`, email: persona.email };
}

/**
 * Development-only auth. Rules:
 * - an e-mail matching a persona signs in as that persona, any other e-mail as the default persona;
 * - password "senha-errada" simulates invalid credentials;
 * - `signInAsPersona` powers the persona picker on the login screen.
 */
export class MockAuthGateway implements AuthGateway {
  readonly kind = "mock" as const;
  private listeners = new Set<(identity: AuthIdentity | null) => void>();

  async initialize(): Promise<AuthIdentity | null> {
    const restored = await mockState.restore();
    return identityFor(restored);
  }

  onIdentityChanged(listener: (identity: AuthIdentity | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async signIn(email: string, password: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (!password || password === "senha-errada") throw new AuthError("invalid-credentials");
    const persona = findPersonaByEmail(email)?.id ?? DEFAULT_PERSONA_ID;
    await this.signInAsPersona(persona);
  }

  async signInAsPersona(id: MockPersonaId): Promise<void> {
    await mockState.setPersona(id);
    this.emit();
  }

  async signOut(): Promise<void> {
    await mockState.setPersona(null);
    this.emit();
  }

  async getIdToken(): Promise<string | null> {
    const id = mockState.currentPersonaId;
    return id ? `mock-token.${id}` : null;
  }

  async sendPasswordReset(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (currentPassword === "senha-errada") throw new AuthError("wrong-current-password");
    if (newPassword.length < 8) throw new AuthError("weak-password");
  }

  private emit(): void {
    const identity = identityFor(mockState.currentPersonaId);
    for (const listener of this.listeners) listener(identity);
  }
}
