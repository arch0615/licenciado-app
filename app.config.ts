import type { ConfigContext, ExpoConfig } from "expo/config";

const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? "development";
const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === "true";

// Mock data must never reach a store build (see docs/mobile-mvp-scope.md §8).
if (APP_ENV === "production" && USE_MOCKS) {
  throw new Error("EXPO_PUBLIC_USE_MOCKS=true is not allowed when EXPO_PUBLIC_APP_ENV=production.");
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
    bundleIdentifier: "br.com.acvel.licenciado"
  },
  android: {
    package: "br.com.acvel.licenciado",
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
