#!/usr/bin/env node
/**
 * Validates the client's Firebase native files and derives the JS SDK config from them.
 *   npm run firebase:check [-- --write-env]
 * Checks: both files exist and parse, package/bundle id = com.acvel.app, same Firebase project on
 * both platforms. Prints the EXPO_PUBLIC_FIREBASE_* values (public by design, never secrets).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const APP_ID = "com.acvel.app";
const IOS = "firebase/GoogleService-Info.plist";
const ANDROID = "firebase/google-services-android.json";
const problems = [];

function plistValue(xml, key) {
  const match = new RegExp(`<key>${key}</key>\\s*<(string|true|false)\\s*/?>([^<]*)`).exec(xml);
  return match ? (match[1] === "string" ? match[2].trim() : match[1]) : null;
}

let ios = null;
if (!existsSync(IOS)) problems.push(`missing ${IOS}`);
else {
  const xml = readFileSync(IOS, "utf8");
  ios = {
    bundleId: plistValue(xml, "BUNDLE_ID"),
    projectId: plistValue(xml, "PROJECT_ID"),
    apiKey: plistValue(xml, "API_KEY"),
    appId: plistValue(xml, "GOOGLE_APP_ID")
  };
  if (ios.bundleId !== APP_ID) problems.push(`iOS BUNDLE_ID is "${ios.bundleId}", expected "${APP_ID}"`);
}

let android = null;
if (!existsSync(ANDROID)) problems.push(`missing ${ANDROID}`);
else {
  const json = JSON.parse(readFileSync(ANDROID, "utf8"));
  const client = (json.client ?? []).find((c) => c.client_info?.android_client_info?.package_name === APP_ID);
  if (!client) {
    const found = (json.client ?? []).map((c) => c.client_info?.android_client_info?.package_name).join(", ");
    problems.push(`no Android client with package "${APP_ID}" (found: ${found || "none"})`);
  }
  android = {
    projectId: json.project_info?.project_id ?? null,
    apiKey: client?.api_key?.[0]?.current_key ?? null,
    appId: client?.client_info?.mobilesdk_app_id ?? null
  };
}

if (ios && android && ios.projectId !== android.projectId) {
  problems.push(`different Firebase projects: iOS "${ios.projectId}" vs Android "${android.projectId}"`);
}

const projectId = android?.projectId ?? ios?.projectId;
const env = {
  EXPO_PUBLIC_FIREBASE_API_KEY: android?.apiKey ?? ios?.apiKey ?? "",
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: projectId ? `${projectId}.firebaseapp.com` : "",
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: projectId ?? "",
  // The JS SDK accepts a platform app id; prefer the Firebase *web* app id if the client provides one.
  EXPO_PUBLIC_FIREBASE_APP_ID: android?.appId ?? ios?.appId ?? ""
};

for (const [key, value] of Object.entries(env)) console.log(`${key}=${value}`);

if (process.argv.includes("--write-env") && problems.length === 0) {
  let text = existsSync(".env") ? readFileSync(".env", "utf8") : readFileSync(".env.example", "utf8");
  for (const [key, value] of Object.entries(env)) {
    const line = `${key}=${value}`;
    text = new RegExp(`^${key}=.*$`, "m").test(text) ? text.replace(new RegExp(`^${key}=.*$`, "m"), line) : `${text.trimEnd()}\n${line}\n`;
  }
  writeFileSync(".env", text);
  console.log("✔ wrote Firebase values to .env");
}

if (problems.length) {
  for (const problem of problems) console.error(`✖ ${problem}`);
  process.exit(1);
}
console.log(`✔ Firebase native files valid for ${APP_ID} (project ${projectId})`);
