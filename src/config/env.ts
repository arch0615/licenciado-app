import { z } from "zod";

/**
 * Runtime configuration from EXPO_PUBLIC_* variables.
 * Expo inlines EXPO_PUBLIC_* only when referenced statically (process.env.EXPO_PUBLIC_X),
 * so every variable is read explicitly at the bottom of this file. These values ship inside the
 * app bundle: never put secrets here (the Firebase web config is public by design).
 */
const url = z.string().trim().default("");

const envSchema = z
  .object({
    appEnv: z.enum(["development", "preview", "production"]).default("development"),
    useMocks: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    authApiUrl: url,
    businessApiUrl: url,
    rateioApiUrl: url,
    consumidorAppUrl: url,
    licenciadoWebUrl: url,
    termsUrl: url,
    privacyUrl: url,
    apiTimeoutMs: z.coerce.number().int().min(1000).max(60000).default(15000),
    firebase: z.object({
      apiKey: z.string().trim().default(""),
      authDomain: z.string().trim().default(""),
      projectId: z.string().trim().default(""),
      appId: z.string().trim().default("")
    })
  })
  .superRefine((env, ctx) => {
    const urls = {
      authApiUrl: env.authApiUrl,
      businessApiUrl: env.businessApiUrl,
      rateioApiUrl: env.rateioApiUrl,
      consumidorAppUrl: env.consumidorAppUrl,
      licenciadoWebUrl: env.licenciadoWebUrl,
      termsUrl: env.termsUrl,
      privacyUrl: env.privacyUrl
    };
    for (const [key, value] of Object.entries(urls)) {
      if (value && !/^https?:\/\//.test(value)) {
        ctx.addIssue({ code: "custom", path: [key], message: "must be an http(s) URL" });
      }
      if (value && env.appEnv === "production" && !value.startsWith("https://")) {
        ctx.addIssue({ code: "custom", path: [key], message: "production requires https" });
      }
    }
    if (env.appEnv === "production") {
      if (env.useMocks) {
        ctx.addIssue({ code: "custom", path: ["useMocks"], message: "Mocks are not allowed in production builds." });
      }
      if (!env.authApiUrl || !env.businessApiUrl) {
        ctx.addIssue({ code: "custom", path: ["authApiUrl"], message: "production requires the auth and business API URLs" });
      }
      if (!env.firebase.apiKey || !env.firebase.projectId || !env.firebase.appId) {
        ctx.addIssue({ code: "custom", path: ["firebase"], message: "production requires the Firebase config" });
      }
    }
  });

export type AppConfig = z.infer<typeof envSchema>;
export type ApiService = "auth" | "business" | "rateio";

export type RawEnv = {
  EXPO_PUBLIC_APP_ENV?: string;
  EXPO_PUBLIC_USE_MOCKS?: string;
  EXPO_PUBLIC_AUTH_API_URL?: string;
  EXPO_PUBLIC_BUSINESS_API_URL?: string;
  EXPO_PUBLIC_RATEIO_API_URL?: string;
  EXPO_PUBLIC_CONSUMIDOR_APP_URL?: string;
  EXPO_PUBLIC_LICENCIADO_WEB_URL?: string;
  EXPO_PUBLIC_TERMS_URL?: string;
  EXPO_PUBLIC_PRIVACY_URL?: string;
  EXPO_PUBLIC_API_TIMEOUT_MS?: string;
  EXPO_PUBLIC_FIREBASE_API_KEY?: string;
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
  EXPO_PUBLIC_FIREBASE_PROJECT_ID?: string;
  EXPO_PUBLIC_FIREBASE_APP_ID?: string;
};

const stripSlash = (value: string) => value.replace(/\/+$/, "");

export function parseConfig(raw: RawEnv): AppConfig {
  const parsed = envSchema.safeParse({
    appEnv: raw.EXPO_PUBLIC_APP_ENV || undefined,
    useMocks: raw.EXPO_PUBLIC_USE_MOCKS || undefined,
    authApiUrl: raw.EXPO_PUBLIC_AUTH_API_URL || undefined,
    businessApiUrl: raw.EXPO_PUBLIC_BUSINESS_API_URL || undefined,
    rateioApiUrl: raw.EXPO_PUBLIC_RATEIO_API_URL || undefined,
    consumidorAppUrl: raw.EXPO_PUBLIC_CONSUMIDOR_APP_URL || undefined,
    licenciadoWebUrl: raw.EXPO_PUBLIC_LICENCIADO_WEB_URL || undefined,
    termsUrl: raw.EXPO_PUBLIC_TERMS_URL || undefined,
    privacyUrl: raw.EXPO_PUBLIC_PRIVACY_URL || undefined,
    apiTimeoutMs: raw.EXPO_PUBLIC_API_TIMEOUT_MS || undefined,
    firebase: {
      apiKey: raw.EXPO_PUBLIC_FIREBASE_API_KEY || undefined,
      authDomain: raw.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || undefined,
      projectId: raw.EXPO_PUBLIC_FIREBASE_PROJECT_ID || undefined,
      appId: raw.EXPO_PUBLIC_FIREBASE_APP_ID || undefined
    }
  });
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid app configuration: ${details}`);
  }
  const env = parsed.data;
  return {
    ...env,
    authApiUrl: stripSlash(env.authApiUrl),
    businessApiUrl: stripSlash(env.businessApiUrl),
    rateioApiUrl: stripSlash(env.rateioApiUrl),
    consumidorAppUrl: stripSlash(env.consumidorAppUrl),
    licenciadoWebUrl: stripSlash(env.licenciadoWebUrl)
  };
}

export function isFirebaseConfigured(appConfig: AppConfig): boolean {
  const { apiKey, projectId, appId } = appConfig.firebase;
  return Boolean(apiKey && projectId && appId);
}

export const config: AppConfig = parseConfig({
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_USE_MOCKS: process.env.EXPO_PUBLIC_USE_MOCKS,
  EXPO_PUBLIC_AUTH_API_URL: process.env.EXPO_PUBLIC_AUTH_API_URL,
  EXPO_PUBLIC_BUSINESS_API_URL: process.env.EXPO_PUBLIC_BUSINESS_API_URL,
  EXPO_PUBLIC_RATEIO_API_URL: process.env.EXPO_PUBLIC_RATEIO_API_URL,
  EXPO_PUBLIC_CONSUMIDOR_APP_URL: process.env.EXPO_PUBLIC_CONSUMIDOR_APP_URL,
  EXPO_PUBLIC_LICENCIADO_WEB_URL: process.env.EXPO_PUBLIC_LICENCIADO_WEB_URL,
  EXPO_PUBLIC_TERMS_URL: process.env.EXPO_PUBLIC_TERMS_URL,
  EXPO_PUBLIC_PRIVACY_URL: process.env.EXPO_PUBLIC_PRIVACY_URL,
  EXPO_PUBLIC_API_TIMEOUT_MS: process.env.EXPO_PUBLIC_API_TIMEOUT_MS,
  EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
});
