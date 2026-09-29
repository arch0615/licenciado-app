/**
 * Development tools slot. Renders the mock persona / maintenance panel only when
 * EXPO_PUBLIC_USE_MOCKS=true.
 *
 * The `require` must sit INSIDE a positive `if (process.env.EXPO_PUBLIC_USE_MOCKS === "true")` block
 * (not after an early return): Metro folds that literal condition before collecting dependencies,
 * so with mocks off the mock modules are not bundled at all (verified by the production export check).
 */
export function DevTools() {
  if (process.env.EXPO_PUBLIC_USE_MOCKS === "true") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- conditional require keeps mock code out of production bundles
    const { MockDevPanel } = require("@/mock/MockDevPanel") as typeof import("@/mock/MockDevPanel");
    return <MockDevPanel />;
  }
  return null;
}
