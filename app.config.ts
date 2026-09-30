/// <reference types="node" />
import { existsSync } from "node:fs";

import type { ConfigContext, ExpoConfig } from "expo/config";

const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? "development";
const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === "true";

// Mock data must never reach a store build (see docs/mobile-mvp-scope.md §8).
if (APP_ENV === "production" && USE_MOCKS) {
  throw new Error("EXPO_PUBLIC_USE_MOCKS=true is not allowed when EXPO_PUBLIC_APP_ENV=production.");
}

/** Native app id registered in Firebase for both platforms (client requirement). */
const APP_ID = "com.acvel.app";

/**
 * Firebase native config files provided by the client (git-ignored, see firebase/README.md).
 * Wired only when present so CI and mock builds still work; `npm run firebase:check` validates them.
 */
const IOS_FIREBASE_FILE = "./firebase/GoogleService-Info.plist";
const ANDROID_FIREBASE_FILE = "./firebase/google-services-android.json";
const iosGoogleServicesFile = existsSync(IOS_FIREBASE_FILE) ? IOS_FIREBASE_FILE : undefined;
const androidGoogleServicesFile = existsSync(ANDROID_FIREBASE_FILE) ? ANDROID_FIREBASE_FILE : undefined;

// Native production builds (EAS) must embed the client's files; JS-only exports do not need them.
if (APP_ENV === "production" && process.env.EAS_BUILD === "true" && (!iosGoogleServicesFile || !androidGoogleServicesFile)) {
  throw new Error("Production builds need firebase/GoogleService-Info.plist and firebase/google-services-android.json.");
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_ENV === "production" ? "ACVEL Licenciado" : `ACVEL Licenciado (${APP_ENV})`,
  slug: "acvel-licenciado",
  version: "0.1.0",
  orientation: "portrait",
  scheme: "acvel-licenciado",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  ios: {
    supportsTablet: true,
    bundleIdentifier: APP_ID,
    googleServicesFile: iosGoogleServicesFile
  },
  android: {
    package: APP_ID,
    googleServicesFile: androidGoogleServicesFile,
    adaptiveIcon: {
      backgroundColor: "#094496",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png"
    },
    predictiveBackGestureEnabled: false
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#094496",
        image: "./assets/splash-icon.png",
        imageWidth: 160,
        dark: { backgroundColor: "#0C1322", image: "./assets/splash-icon.png" }
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    appEnv: APP_ENV
  }
});
