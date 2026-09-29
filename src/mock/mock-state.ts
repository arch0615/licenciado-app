import { secureStorage } from "@/services/storage/secure-storage";

import { findPersona, type MockPersonaId } from "./personas";

const PERSONA_KEY = "acvel.mock.persona";

type Listener = () => void;

/**
 * Mutable state behind the mock backend and mock auth (development only):
 * the signed-in persona and the simulated maintenance flag.
 */
class MockState {
  private personaId: MockPersonaId | null = null;
  private maintenance = false;
  private listeners = new Set<Listener>();

  async restore(): Promise<MockPersonaId | null> {
    const stored = await secureStorage.get(PERSONA_KEY);
    this.personaId = findPersona(stored)?.id ?? null;
    return this.personaId;
  }

  get currentPersonaId(): MockPersonaId | null {
    return this.personaId;
  }

  async setPersona(id: MockPersonaId | null): Promise<void> {
    this.personaId = id;
    if (id) await secureStorage.set(PERSONA_KEY, id);
    else await secureStorage.remove(PERSONA_KEY);
    this.emit();
  }

  get maintenanceEnabled(): boolean {
    return this.maintenance;
  }

  setMaintenance(enabled: boolean): void {
    this.maintenance = enabled;
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export const mockState = new MockState();
