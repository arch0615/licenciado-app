import Constants from "expo-constants";
import { Platform } from "react-native";

import { config, isFirebaseConfigured } from "@/config/env";
import { UnconfiguredAuthGateway, type AuthGateway } from "@/features/auth/auth-gateway";

import { createApiClient } from "./api/client";
import { createHttpTransport } from "./api/http-transport";
import type { ApiClient, ApiTransport } from "./api/types";

/**
 * Composition root: picks mock or real implementations once.
 *
 * Mock branches test `process.env.EXPO_PUBLIC_USE_MOCKS` **inline in each if** (never through a variable):
 * Expo inlines the value and Metro folds the condition before collecting dependencies, so with
 * mocks off the `require`d mock modules are not part of the bundle at all. Verified by
 * `npm run check:prod-bundle`.
 */

function createAuthGateway(): AuthGateway {
  if (process.env.EXPO_PUBLIC_USE_MOCKS === "true") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- conditional require keeps mock code out of production bundles
    const { MockAuthGateway } = require("@/mock/mock-auth-gateway") as typeof import("@/mock/mock-auth-gateway");
    return new MockAuthGateway();
  }
  if (isFirebaseConfigured(config)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so tests and unconfigured builds never initialize Firebase
    const { FirebaseAuthGateway } = require("@/features/auth/firebase-auth-gateway") as typeof import("@/features/auth/firebase-auth-gateway");
    return new FirebaseAuthGateway({
      apiKey: config.firebase.apiKey,
      authDomain: config.firebase.authDomain || undefined,
      projectId: config.firebase.projectId,
      appId: config.firebase.appId
    });
  }
  // Fail closed: without Firebase config the app stays signed out.
  return new UnconfiguredAuthGateway();
}

export const authGateway: AuthGateway = createAuthGateway();

function createTransport(): ApiTransport {
  if (process.env.EXPO_PUBLIC_USE_MOCKS === "true") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- conditional require keeps mock code out of production bundles
    const { createMockTransport } = require("./api/mock-transport") as typeof import("./api/mock-transport");
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- conditional require keeps mock code out of production bundles
    const { mockRoutes } = require("@/mock/handlers") as typeof import("@/mock/handlers");
    return createMockTransport(mockRoutes);
  }
  return createHttpTransport({
    baseUrls: { auth: config.authApiUrl, business: config.businessApiUrl, rateio: config.rateioApiUrl },
    timeoutMs: config.apiTimeoutMs,
    tokens: authGateway,
    onUnauthorized: () => {
      void authGateway.signOut();
    },
    clientHeaders: {
      "X-Client-Platform": Platform.OS,
      "X-Client-Version": String(Constants.expoConfig?.version ?? "0.0.0")
    }
  });
}

export const api: ApiClient = createApiClient(createTransport());
export const usingMocks = process.env.EXPO_PUBLIC_USE_MOCKS === "true";
