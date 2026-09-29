import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  EmailAuthProvider,
  getReactNativePersistence,
  initializeAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  type Auth,
  type User
} from "firebase/auth";

import { AuthError, mapFirebaseAuthErrorCode, type AuthGateway } from "./auth-gateway";
import type { AuthIdentity } from "./types";

const toIdentity = (user: User | null): AuthIdentity | null => (user ? { uid: user.uid, email: user.email } : null);

const firebaseCode = (error: unknown): string | undefined =>
  typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : undefined;

/**
 * Firebase Authentication through the Firebase JS SDK (works in Expo Go and dev builds).
 * - Session persisted with AsyncStorage (Firebase stores its refresh token there; the app itself
 *   never stores tokens).
 * - `getIdToken()` returns a cached token the SDK refreshes before expiry; `getIdToken(true)` forces a
 *   refresh (used once by the HTTP transport after a 401).
 */
export class FirebaseAuthGateway implements AuthGateway {
  readonly kind = "firebase" as const;
  private readonly auth: Auth;

  constructor(options: FirebaseOptions) {
    const app = getApps().length > 0 ? getApp() : initializeApp(options);
    this.auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
    this.auth.languageCode = "pt-BR";
  }

  async initialize(): Promise<AuthIdentity | null> {
    await this.auth.authStateReady();
    return toIdentity(this.auth.currentUser);
  }

  onIdentityChanged(listener: (identity: AuthIdentity | null) => void): () => void {
    return onAuthStateChanged(this.auth, (user) => listener(toIdentity(user)));
  }

  async signIn(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(this.auth, email.trim().toLowerCase(), password);
    } catch (error) {
      throw new AuthError(mapFirebaseAuthErrorCode(firebaseCode(error)));
    }
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(this.auth);
  }

  async getIdToken(forceRefresh = false): Promise<string | null> {
    const user = this.auth.currentUser;
    if (!user) return null;
    try {
      return await user.getIdToken(forceRefresh);
    } catch {
      // Refresh token revoked/expired or offline: treat as no token; the transport reports it.
      return null;
    }
  }

  async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email.trim().toLowerCase());
    } catch (error) {
      const code = mapFirebaseAuthErrorCode(firebaseCode(error));
      // Do not reveal whether the e-mail exists.
      if (code === "invalid-credentials") return;
      throw new AuthError(code);
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user?.email) throw new AuthError("requires-recent-login");
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
    } catch (error) {
      const code = mapFirebaseAuthErrorCode(firebaseCode(error));
      throw new AuthError(code === "invalid-credentials" ? "wrong-current-password" : code);
    }
    try {
      await updatePassword(user, newPassword);
    } catch (error) {
      throw new AuthError(mapFirebaseAuthErrorCode(firebaseCode(error)));
    }
  }
}
