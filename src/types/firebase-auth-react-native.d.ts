/**
 * Firebase ships `getReactNativePersistence` only in its React Native build (`react-native` export
 * condition, resolved by Metro at runtime). The public TypeScript entry omits it, so we declare it.
 */
import type { Persistence } from "firebase/auth";

declare module "firebase/auth" {
  export function getReactNativePersistence(storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
