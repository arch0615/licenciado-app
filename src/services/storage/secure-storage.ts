import * as SecureStore from "expo-secure-store";

/**
 * Small key/value persistence for preferences and flags (theme, mock persona, remembered e-mail).
 * Never store ID tokens here — the Firebase SDK manages its own credentials.
 * Failures are swallowed on purpose: persistence is a convenience, not a requirement.
 */
export const secureStorage = {
  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // ignore
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
  }
};
