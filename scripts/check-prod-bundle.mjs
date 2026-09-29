#!/usr/bin/env node
/**
 * Guards the rule "mock data never ships": exports a production-configured Android bundle
 * (mocks off) and fails if any mock marker is present. Run before every store build:
 *   npm run check:prod-bundle
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const OUT = ".expo-export-check-prod";
const MARKERS = [
  "licenciado@acvel.dev", // mock persona e-mail
  "acvel.mock.persona", // mock state storage key
  "mock-token.", // mock ID token prefix
  "signInAsPersona", // mock auth gateway
  "MOCK_NOT_FOUND" // mock transport
];
const REQUIRED = [
  "API_NOT_CONFIGURED", // real HTTP client
  "auth/requires-recent-login" // Firebase auth gateway (error mapping)
];

const https = (name, fallback) => (process.env[name]?.startsWith("https://") ? process.env[name] : fallback);

rmSync(OUT, { recursive: true, force: true });
const result = spawnSync(`npx expo export --platform android --output-dir ${OUT} --clear`, {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    EXPO_PUBLIC_APP_ENV: "production",
    EXPO_PUBLIC_USE_MOCKS: "false",
    EXPO_PUBLIC_AUTH_API_URL: https("EXPO_PUBLIC_AUTH_API_URL", "https://auth.example.com"),
    EXPO_PUBLIC_BUSINESS_API_URL: https("EXPO_PUBLIC_BUSINESS_API_URL", "https://api.example.com"),
    EXPO_PUBLIC_RATEIO_API_URL: https("EXPO_PUBLIC_RATEIO_API_URL", ""),
    // Placeholder Firebase web config: only needs to pass validation for the export.
    EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "check-bundle-key",
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "check-bundle",
    EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:0:web:0"
  }
});
if (result.status !== 0) {
  console.error("✖ production export failed");
  process.exit(result.status ?? 1);
}

const dir = join(OUT, "_expo", "static", "js", "android");
if (!existsSync(dir)) {
  console.error("✖ bundle not found");
  process.exit(1);
}
const bundle = readdirSync(dir)
  .filter((file) => file.endsWith(".hbc") || file.endsWith(".js"))
  .map((file) => readFileSync(join(dir, file)).toString("latin1"))
  .join("\n");

const leaked = MARKERS.filter((marker) => bundle.includes(marker));
const missing = REQUIRED.filter((marker) => !bundle.includes(marker));
rmSync(OUT, { recursive: true, force: true });

if (leaked.length || missing.length) {
  if (leaked.length) console.error(`✖ mock code found in the production bundle: ${leaked.join(", ")}`);
  if (missing.length) console.error(`✖ expected production code missing: ${missing.join(", ")}`);
  process.exit(1);
}
process.stdout.write("✔ production bundle contains no mock code\n");
