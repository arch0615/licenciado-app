const path = require("node:path");

/**
 * jest-expo's setup requires `expo-modules-core` without declaring it, relying on npm hoisting it to the
 * top-level node_modules. Since expo 57.0.26 npm installs it nested under `expo/node_modules`, so resolve it
 * through `expo` (works whether it is nested or hoisted).
 */
const expoModulesCore = path.dirname(
  require.resolve("expo-modules-core/package.json", { paths: [path.dirname(require.resolve("expo/package.json"))] })
);

/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|lucide-react-native)"
  ],
  testMatch: ["**/__tests__/**/*.test.ts?(x)"],
  moduleNameMapper: {
    "^lucide-react-native$": "<rootDir>/test/mocks/lucide-react-native.js",
    "^expo-modules-core$": expoModulesCore,
    "^expo-modules-core/(.*)$": `${expoModulesCore}/$1`,
    "^@/(.*)$": "<rootDir>/src/$1"
  }
};
